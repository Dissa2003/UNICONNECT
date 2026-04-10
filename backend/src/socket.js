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

    socket.on("disconnect", () => {
      clearInterval(reminderInterval);
      console.log(`⚡ Socket disconnected: ${socket.userId}`);
    });
  });

  return io;
}

module.exports = { initSocket };
