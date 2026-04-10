const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const StudyGroup = require("./models/StudyGroup");
const Message = require("./models/Message");
const Todo = require("./models/Todo");
const { getBotReply } = require("./services/botService");
const { queryPdf } = require("./services/pdfService");

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // ── Auth middleware – verify JWT before allowing connection ──
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    try {
      const decoded = jwt.verify(token, "secretkey");
      socket.userId = decoded.id;
      socket.userName = decoded.name || "User";
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    console.log(`⚡ Socket connected: ${socket.userId}`);

    // Auto-join all study groups the user belongs to
    try {
      const groups = await StudyGroup.find({ "members.user": socket.userId });
      for (const g of groups) {
        socket.join(String(g._id));
      }
      // Notify the client which rooms they joined
      socket.emit("joined-groups", groups.map((g) => String(g._id)));
    } catch (err) {
      console.error("Error joining rooms:", err.message);
    }

    // ── Send message to a group room ──
    socket.on("send-message", async (data) => {
      try {
        const { groupId, content } = data;
        if (!groupId || !content || !content.trim()) return;

        // verify membership
        const group = await StudyGroup.findById(groupId);
        if (!group) return;
        const isMember = group.members.some(
          (m) => String(m.user) === String(socket.userId)
        );
        if (!isMember) return;

        const msg = await Message.create({
          group: groupId,
          sender: socket.userId,
          type: "text",
          content: content.trim(),
        });

        const populated = await msg.populate("sender", "name email");

        // broadcast to the whole room (including sender)
        io.to(groupId).emit("new-message", populated);

        // ── @bot trigger ──
        if (content.trim().toLowerCase().startsWith("@bot")) {
          const prompt = content.trim().substring(4).trim();
          if (prompt) {
            io.to(groupId).emit("bot-typing", { groupId });
            const reply = await getBotReply(prompt);
            if (reply) {
              const botMsg = await Message.create({
                group: groupId,
                sender: null,
                isBot: true,
                type: "text",
                content: reply,
              });
              const botPopulated = botMsg.toObject();
              botPopulated.sender = { _id: "bot", name: "@bot", email: "bot@uniconnect" };
              io.to(groupId).emit("new-message", botPopulated);
            }
            io.to(groupId).emit("bot-stop-typing", { groupId });
          }
        }
      } catch (err) {
        console.error("send-message error:", err.message);
      }
    });

    // ── Typing indicator ──
    socket.on("typing", ({ groupId }) => {
      socket.to(groupId).emit("user-typing", {
        userId: socket.userId,
        userName: socket.userName,
      });
    });

    socket.on("stop-typing", ({ groupId }) => {
      socket.to(groupId).emit("user-stop-typing", {
        userId: socket.userId,
      });
    });

    // ── Reference Flow – private PDF Q&A ──
    socket.on("ref-query", async ({ question }) => {
      try {
        if (!question || !question.trim()) return;
        socket.emit("ref-typing");
        const answer = await queryPdf(socket.userId, question.trim());
        socket.emit("ref-reply", { answer });
      } catch (err) {
        console.error("ref-query error:", err.message);
        socket.emit("ref-reply", {
          answer: "Something went wrong. Please try again.",
        });
      }
    });

    // ── Reminder scheduler – check every 60 s for due reminders ──
    const checkReminders = async () => {
      try {
        const now = new Date();
        const windowStart = new Date(now.getTime() - 60 * 1000);
        const due = await Todo.find({
          userId: socket.userId,
          reminderAt: { $gte: windowStart, $lte: now },
          reminderSent: false,
          completed: false,
        });
        for (const todo of due) {
          socket.emit("reminder-alert", {
            _id: String(todo._id),
            title: todo.title,
            description: todo.description,
            dueDate: todo.dueDate,
            reminderAt: todo.reminderAt,
          });
          todo.reminderSent = true;
          await todo.save();
        }
      } catch (err) {
        console.error("reminder check error:", err.message);
      }
    };
    const reminderInterval = setInterval(checkReminders, 60 * 1000);

    // ─────────────────────────────────────────────────────────────────────────
    // WEBRTC SIGNALING — Audio Room events
    // These are all relay-only lah — the backend never touches the SDP itself
    // We just pass the signal data between the two peers lor
    // ─────────────────────────────────────────────────────────────────────────

    // join-voice-room — Both users must call this with the same roomId
    // Once both are in, the initiating peer (host) starts the WebRTC handshake sia
    socket.on("join-voice-room", ({ roomId }) => {
      if (!roomId) return;

      socket.join(`voice:${roomId}`);
      console.log(`🎙️  ${socket.userId} joined voice room: ${roomId}`);

      // Tell the OTHER person in this room that a new peer has arrived lor
      // Only emit to the room EXCLUDING this socket — no need to tell yourself lah
      socket.to(`voice:${roomId}`).emit("voice-peer-joined", {
        peerId: socket.userId,
        roomId,
      });
    });

    // signal-data — Relay WebRTC offer, answer, and ICE candidates between peers
    // simple-peer on the frontend fires this automatically for us lor
    // We just forward the signal blob to the other person in the room sia
    socket.on("signal-data", ({ roomId, signalData }) => {
      if (!roomId || !signalData) return;

      // Broadcast to the OTHER peer in the voice room — not back to sender lah
      socket.to(`voice:${roomId}`).emit("signal-data", {
        from: socket.userId,
        signalData,
      });
    });

    // end-call — One peer ended the call, tell the other to clean up lor
    // This fires when user clicks End Call button or the component unmounts sia
    socket.on("end-call", ({ roomId }) => {
      if (!roomId) return;

      console.log(`📵  ${socket.userId} ended call in room: ${roomId}`);

      // Notify the other peer in the room to disconnect their WebRTC connection lah
      socket.to(`voice:${roomId}`).emit("call-ended", {
        by: socket.userId,
        roomId,
      });

      // Leave the socket room too — clean up lor
      socket.leave(`voice:${roomId}`);
    });

    // ── voice-room:* events — used by useVoiceChat.js / voice-room-service lah ──
    // These mirror join-voice-room/signal-data/end-call but with the microservice
    // event naming convention so frontend hook works against main backend lor
    socket.on("voice-room:join", ({ roomId }) => {
      if (!roomId) return;
      socket.join(`voice:${roomId}`);
      console.log(`🎙️  ${socket.userId} joined voice:${roomId}`);
      socket.to(`voice:${roomId}`).emit("voice-peer-ready", {
        peerId: socket.userId,
        roomId,
      });
    });

    socket.on("voice-room:signal", ({ roomId, signalData }) => {
      if (!roomId || !signalData) return;
      socket.to(`voice:${roomId}`).emit("voice-room:signal", {
        from: socket.userId,
        signalData,
      });
    });

    socket.on("voice-room:end", ({ roomId }) => {
      if (!roomId) return;
      console.log(`📵  ${socket.userId} ended voice-room: ${roomId}`);
      socket.to(`voice:${roomId}`).emit("voice-room:ended", {
        by: socket.userId,
        roomId,
      });
      socket.leave(`voice:${roomId}`);
    });
    // ─────────────────────────────────────────────────────────────────────────

    socket.on("disconnect", () => {
      clearInterval(reminderInterval);
      console.log(`⚡ Socket disconnected: ${socket.userId}`);
    });
  });

  return io;
}

module.exports = { initSocket };
