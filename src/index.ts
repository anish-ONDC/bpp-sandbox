import { createApp } from "./app";
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 8080;
const app = createApp();
app.listen(Number(PORT), () => console.log(`Server is running on port ${PORT}`));
