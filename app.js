const express = require("express");
const session = require("express-session");
const http = require("http");
const path =require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const AyoFoods = {
  2: "Amala & Ewedu",
  3: "Fufu & Equsi ",
  4: "ofada rice & chicken stew",
  5: "Banga Soup & Semo",
};




const orderHistory = [];

const sessionMiddleware = session({
  secret: "secret-key",
  resave: false,
  saveUninitialized: true,
});

app.use(express.static("public"));
app.use(sessionMiddleware);

app.get("/", async (req, res) => {
    try {
      // Attempt to serve the "index.html" file located in the same directory as the script
      res.sendFile(__dirname +"./index.html");
    } catch (err) {
      // Log any errors that occur while serving the file
      console.log(err);
      // Return a 500 status code with an error message if the file cannot be served
      res.status(500).send("Error serving restaurant.html");
    }
  });

io.use((socket, next) => {
  sessionMiddleware(socket.request, socket.request.res, next);
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  const state = {
    userName: "",
    currentOrder: [],
  };

  const botMessage = async (message) => {
    console.log("Bot message received:", message);
    socket.emit("bot-message", message);
  };

  const userMessage = async (message) => {
    console.log("User message received:", message);

    try {
      if (!state.userName) {
        // Save the user's name and update the welcome message
        state.userName = message;
        await botMessage(
          `Welcome to the ChatBot, ${state.userName}! Place an order\n1. Typehere\n99. Typehere\n98. Typehere\n97. Typehere\n0. Cancel order`
        );
      } else {
        switch (message) {
          case "1":
            // Generate the list of items dynamically
            const itemOptions = Object.keys(AyoFoods)
              .map((key) => `${key}. ${AyoFoods[key]}`)
              .join("\n");
            await botMessage(
              `Here is a list of items you can order:\n ${itemOptions} \nPlease select one by typing its number.`
            );
            break;
          case "2":
          case "3":
          case "4":
          case "5":
            // Parse the number from the user input and add the corresponding item to the current order
            const selectedIndex = parseInt(message);
            if (AyoFoods.hasOwnProperty(selectedIndex)) {
              const selectedItem = AyoFoods[selectedIndex];
              state.currentOrder.push(selectedItem);
              await botMessage(
                `${selectedItem} has been added to your order. Do you want to add more items to your order? Type numbers. If not, type 99 to checkout.`
              );
            } else {
              await botMessage("Invalid selection.");
            }
            break;
          case "99":
            if (state.currentOrder.length === 0) {
              await botMessage(
                "No order to place. Place an order\n1. See menu"
              );
            } else {
              orderHistory.push(state.currentOrder);
              await botMessage("Order placed");
              state.currentOrder = [];
            }
            break;
          case "98":
            if (orderHistory.length === 0) {
              await botMessage("No previous orders");
            } else {
              const orderHistoryString = orderHistory
                .map(
                  (order, index) => `Order ${index + 1}. ${order.join(", ")}`
                )
                .join("\n");
              await botMessage(
                `Here are your previous orders:\n${orderHistoryString}`
              );
            }
            break;
          case "97":
            if (state.currentOrder.length === 0) {
              await botMessage("No current order");
            } else {
              const currentOrderString = state.currentOrder.join(", ");
              await botMessage(
                `Here is your current order:\n${currentOrderString}`
              );
            }
            break;
          case "0":
            if (state.currentOrder.length === 0) {
              await botMessage("No order to cancel");
            } else {
              state.currentOrder = [];
              await botMessage("Order canceled");
            }
            break;
          default:
            await botMessage("Invalid input");
        }
      }
    } catch (err) {
      console.log(err);
      await botMessage("An error occurred while processing your request.");
    }
  };

  socket.on("user-message", userMessage);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("server is Listening on http://localhost:3000");
});
