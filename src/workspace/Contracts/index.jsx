import React, {Component} from "react";
import {ImportOutlined, UploadOutlined} from "@ant-design/icons";
import "./index.css"

class Upload extends Component{
  constructor(props) {
    super(props);
    this.contractAddressInput = React.createRef();
    this.importFromActive = this.importFromActive.bind(this);
    this.importFromStandby = this.importFromStandby.bind(this);
    this.importFromRpcUrl = this.importFromRpcUrl.bind(this);
    this.importFromUpload = this.importFromUpload.bind(this);
    this.importFromFile = this.importFromFile.bind(this);
  }

  importFromActive(){
    let url = new URL(window.parent.document.getElementById("activeServer").value);
    this.importFromRpcUrl(url);
  }
  importFromStandby(){
    let url = new URL(window.parent.document.getElementById("standbyServer").value);
    this.importFromRpcUrl(url);
  }
  importFromRpcUrl(url){
    let contracts = [...this.contractAddressInput.current.value.matchAll(new RegExp(/0[xX][0-9a-fA-F]{40}/g))];
    // todo
  }
  importFromUpload(f){
    let [nef, manifest, dumpnef, nefdbgnfo] = [f.target.files[0], f.target.files[1], f.target.files[2], f.target.files[3]];
    this.importFromFile(nef, manifest, dumpnef, nefdbgnfo)
  }
  importFromFile(nef, manifest, dumpnef, nefdbgnfo){
    console.log(nef, manifest, dumpnef, nefdbgnfo);
    // todo
  }

  render() {
    return (
      <div className="Upload">
        <div>
          <label className="ContractMultiFileUpload">
            <span className="UploadButton">
              <input type="file" multiple="multiple" accept=".nef,.nef.txt,.manifest.json,.nefdbgnfo" onChange={this.importFromUpload}/>
              {/*<input type="file" multiple="multiple" webkitdirectory=""/>*/}
              <UploadOutlined /> UPLOAD FILES
            </span>
          </label>
        </div>
        [.nef, .manifest.json, dumpnef(.nef.txt), .nefdbgnfo]
        <div>
          Or IMPORT these contracts...
          <div>
            <textarea id="contractAddressInput" placeholder="0[xX][0-9a-fA-F]{40}" ref={this.contractAddressInput}
                      style={{width: "336px", height: "28px", alignSelf: "center"}}/>
          </div>
        </div>
        <label className="ContractImport">
          <span className="UploadButton">
            <button onClick={this.importFromActive}/>
            <ImportOutlined /> FROM ACTIVE
          </span>
        </label>
        <label className="ContractImport">
          <span className="UploadButton">
            <button onClick={this.importFromStandby}/>
            <ImportOutlined /> FROM STANDBY
          </span>
        </label>
      </div>
    );
  }
}

class SingleContract extends Component{
  constructor(props) {
    super(props);
    this.name = props.name;
    this.scriptHash = props.scriptHash;
    this.nef = props.nef;  // Buffer
    this.manifest = props.manifest;
    this.dumpnef = props.dumpnef;
    this.nefdbgnfo = props.nefdbgnfo;  // Buffer
    this.saveToStorage = this.saveToStorage.bind(this);
  }

  saveToStorage(){
    localStorage.setItem(this.scriptHash, JSON.stringify({
      "name": this.name,
      "scriptHash": this.scriptHash,
      "nef": this.nef.toString('base64'),
      "manifest": this.manifest,
      "dumpnef": this.dumpnef,
      "nefdbgnfo": this.nefdbgnfo.toString('base64'),
    }))
  }

  loadFromStorage(scriptHash){
    let contract = localStorage.getItem(this.scriptHash);
    // todo
  }

  render() {
    return(
        <div className="SingleContract">

        </div>
    )
  }
}

class ManageContracts extends Component{
  render() {
    return (
        <div className="ManageContracts" id="manageContracts">

        </div>
    );
  }
}

class Contracts extends Component{
  render() {
    return (
      <div className={"Contracts"}>
        <Upload/>
        <ManageContracts/>
      </div>
    );
  }
}

export default Contracts