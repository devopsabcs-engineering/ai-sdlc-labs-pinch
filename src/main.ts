import "./styles.css";
import { startApp } from "./app";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Application root not found.");
startApp(root);
