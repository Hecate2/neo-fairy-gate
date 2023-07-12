import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from "./header";
import LeftMenu from "./leftMenu";
import WorkSpace from "./workspace";
import Contracts from "./workspace/Contracts";
import Test from "./workspace/Test";
import "./App.css"

function Home(){
    const homepage = "/neo-fairy-gate";
    let leftMenu = new LeftMenu({homepage: homepage})
    let workSpace = new WorkSpace({homepage: homepage})
    return (
    <div className={"container"}>
        <Header/>
        {leftMenu.render()}
        {workSpace.render()}
    </div>
    );
}

function App() {
  return (
      <>
        <Routes>
            <Route path={"/"} element={<Home />}/>
            <Route path={"/contracts"} element={<Contracts />}/>
            <Route path={"/test"} element={<Test />}/>
        </Routes>
      </>
  );
}

export default App;
