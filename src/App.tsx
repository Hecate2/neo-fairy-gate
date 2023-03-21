import React from 'react';
import Header from "./header";
import LeftMenu from "./leftMenu";
import Contracts from "./workspace/Contracts";
import "./App.css"

function App() {
  return (
      <body className={"container"}>
        <Header/>
        <LeftMenu/>
        <Contracts/>
      </body>
  );
}

export default App;
