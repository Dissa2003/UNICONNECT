const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const StudyGroup = require("./models/StudyGroup");
const Message = require("./models/Message");

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

    socket.on("disconnect", () => {
      console.log(`⚡ Socket disconnected: ${socket.userId}`);
    });
  });

  return io;
}

module.exports = { initSocket };
