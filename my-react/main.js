import { createElement, render } from "../mini-react";
import { useState } from "../mini-react/render";

// const handleInput = (e) => {
//   renderer(e.target.value);
// };

// const renderer = (value) => {
//   const container = document.querySelector("#root");
//   const element = createElement(
//     // "h1",
//     // { id: "title", style: "background:skyblue" },
//     // "Hello World",
//     // createElement(
//     //   "a",
//     //   { href: "https://www.bilibili.com/", style: "color: yellow" },
//     //   "BiliBili"
//     // )
//     "div",
//     null,
//     createElement("input", { oninput: (e) => handleInput(e) }, null),
//     createElement("h1", null, value)
//   );
//   render(element, container);
// };

// renderer("Hello")

// const App = (props) => {
//   return createElement("h1", null, "Hi", props.name);
// };

const container = document.querySelector("#root");

const Counter = () => {
  const [state, setState] = useState(0);
  return createElement(
    "h1",
    { onclick: () => setState((prev) => prev + 1) },
    state
  );
};



// const element = createElement(App, { name: " changmushu" });
const element = createElement(Counter);
render(element, container);
