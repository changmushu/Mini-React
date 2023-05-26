function createDOM(fiber) {
  //创建元素
  const dom =
    fiber.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type);

  //赋予属性
  Object.keys(fiber.props)
    .filter((key) => key !== "children")
    .forEach((key) => (dom[key] = fiber.props[key]));

  return dom;
}

function render(element, container) {
  winRoot = {
    dom: container,
    props: {
      children: [element],
    },
    sibling: null,
    child: null,
    parent: null,
    alternate: currentRoot,
  };
  deletion = [];
  nextUnitOfWork = winRoot;
}

// function render(element, container) {
//   //创建元素
//   const dom =
//     element.type === "TEXT_ELEMENT"
//       ? document.createTextNode("")
//       : document.createElement(element.type);

//   //赋予属性
//   Object.keys(element.props)
//     .filter((key) => key !== "children")
//     .forEach((key) => (dom[key] = element.props[key]));

//   // //递归渲染子元素
//   // element.props.children.forEach((child) => render(child, dom));

//   //追加到父节点
//   container.append(dom);
// }

let nextUnitOfWork = null;
let winRoot = null;
let currentRoot = null;
let deletion = null;

//保证异步渲染同步提交
function commitRoot() {
  deletion.forEach(commitWork);
  commitWork(winRoot.child);
  currentRoot = winRoot;
  winRoot = null;
}

function commitWork(fiber) {
  if (!fiber) {
    return;
  }

  let domParentFiber = fiber.parent;
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const parentDOM = domParentFiber.dom;

  // const parentDOM = fiber.parent.dom;
  if (fiber.effectTag === "PLACEMENT" && fiber.dom) {
    parentDOM.append(fiber.dom);
  } else if (fiber.effectTag === "DELETION" && fiber.dom) {
    // parentDOM.removeChild(fiber.dom);
    commitDeletion(fiber, parentDOM);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom) {
    updateDOM(fiber.dom, fiber.alternate.props, fiber.props);
  }
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function commitDeletion(fiber, parentDOM) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber.child, parentDOM);
  }
}

function updateDOM(dom, prevProps, nextPorps) {
  const isEvent = (key) => key.startsWith("on");
  // 删除已经没有的props
  Object.keys(prevProps)
    .filter((key) => key != "children" && !isEvent(key))
    // 不在nextProps中
    .filter((key) => !key in nextPorps)
    .forEach((key) => {
      // 清空属性
      dom[key] = "";
    });

  // 添加新增的属性/修改变化的属性
  Object.keys(nextPorps)
    .filter((key) => key !== "children" && !isEvent(key))
    // 不再prevProps中
    .filter((key) => !key in prevProps || prevProps[key] !== nextPorps[key])
    .forEach((key) => {
      dom[key] = nextPorps[key];
    });

  // 删除事件处理函数
  Object.keys(prevProps)
    .filter(isEvent)
    // 新的属性没有，或者有变化
    .filter((key) => !key in nextPorps || prevProps[key] !== nextPorps[key])
    .forEach((key) => {
      const eventType = key.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[key]);
    });

  // 添加新的事件处理函数
  Object.keys(nextPorps)
    .filter(isEvent)
    .filter((key) => prevProps[key] !== nextPorps[key])
    .forEach((key) => {
      const eventType = key.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextPorps[key]);
    });
}

//调度函数
function workLoop(deadLine) {
  //应该退出
  let shouldYield = false;
  //有工作 且 不应该退出
  while (nextUnitOfWork && !shouldYield) {
    //做工作
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    //看看还有没有足够的时间
    shouldYield = deadLine.timeRemaining() < 1;
  }

  //保证异步渲染同步提交
  if (!nextUnitOfWork && winRoot) {
    commitRoot();
  }
  //没有足够的时间，请求下一次浏览器空闲的时候执行
  requestIdleCallback(workLoop);
}

//第一次请求
requestIdleCallback(workLoop);

function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function;
  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    // 正常
    updateHostComponent(fiber);
  }

  // //追加父节点
  // if (fiber.parent) {
  //   fiber.parent.dom.append(fiber.dom);
  // }

  //给children新建fiber

  //给children新建fiber
  const elements = fiber.props.children;

  // 建立fiber树
  // for (let i = 0; i < elements.length; i++) {
  //   const newFiber = {
  //     type: elements[i].type,
  //     props: elements[i].props,
  //     parent: fiber,
  //     dom: null,
  //     child: null,
  //     sibling: null,
  //   };

  //   //如果是第一个
  //   if (i === 0) {
  //     //就是child
  //     fiber.child = newFiber;
  //   } else {
  //     //就是sibling
  //     prevSibling.sibling = newFiber;
  //   }

  //   prevSibling = newFiber;
  // }

  // 如果有child，就返回child fiber
  if (fiber.child) {
    return fiber.child;
  }
  // 没有就优先返回兄弟，向上查找
  // 如果没有，就不返回，返回值为undefined
  let nextFiber = fiber;
  while (nextFiber) {
    // 有sibling
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    // 向上查找
    nextFiber = nextFiber.parent;
  }
}

//处理非函数式组件
function updateHostComponent(fiber) {
  //创建DOM元素
  if (!fiber.dom) {
    fiber.dom = createDOM(fiber);
  }
  //给children新建fiber
  // const elements = fiber.props.children;
  //新建newFiber，构建Fiber
  diffChildren(fiber, fiber.props.children);
}

//记录上一次的fiber
let winFiber = null;
let hookIndex = null;

//处理函数式组件
function updateFunctionComponent(fiber) {
  //给children新建fiber
  const elements = fiber.props.children;

  winFiber = fiber;
  hookIndex = 0;
  winFiber.hooks = [];
  const children = [fiber.type(fiber.props)];
  //新建newFiber，构建Fiber
  diffChildren(fiber, children);
}

//useState Hook
export function useState(initial) {
  //旧的hook
  const oldHook =
    winFiber.alternate &&
    winFiber.alternate.hooks &&
    winFiber.alternate.hooks[hookIndex];

  //新的hook
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  };

  //执行actions，并且更新state
  const actions = oldHook ? oldHook.queue : [];
  actions.forEach((action) => {
    hook.state = action(hook.state);
  });

  const setState = (action) => {
    hook.queue.push(action);
    // 重新设定winRoot，触发渲染更新
    // 重新render
    winRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    };
    nextUnitOfWork = winRoot;
    deletion = [];
  };

  winFiber.hooks.push(hook);
  hookIndex++;
  return [hook.state, setState];
}

function diffChildren(wipFiber, elements) {
  let index = 0;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling = null;

  while (index < elements.length || oldFiber) {
    const element = elements[index];
    const sameType = element && oldFiber && element.type === oldFiber.type;
    let newFiber = null;

    if (sameType) {
      //更新
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      };
    }

    if (element && !sameType) {
      //新建
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
      };
    }

    if (oldFiber && !sameType) {
      //删除
      oldFiber.effectTag = "DELETION";
      deletion.push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    //如果是第一个
    if (index === 0) {
      //就是child
      wipFiber.child = newFiber;
    } else {
      //就是sibling
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;

    index++;
  }
}

export default render;
