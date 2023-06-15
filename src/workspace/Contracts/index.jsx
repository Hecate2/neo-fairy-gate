import React, {Component} from "react";
import { ImportOutlined, UploadOutlined } from "@ant-design/icons";
import { FairyClient } from "../../libs/NeoFairyClient";
import { Hash160Str } from "../../libs/types";
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
      let client = new FairyClient(url);
      client.invokefunction_of_any_contract()
  }
  importFromUpload(f){
    // let files = [f.target.files[0], f.target.files[1], f.target.files[2], f.target.files[3]];
    let files = [...f.target.files];
    let manifest, nef, dumpnef, nefdbgnfo;
    files.forEach(v => {
      let lowerCaseName = v.name.toLowerCase();
      if(lowerCaseName.endsWith(".manifest.json"))  manifest = v;
      if(lowerCaseName.endsWith(".nef"))  nef = v;
      if(lowerCaseName.endsWith(".nef.txt"))  dumpnef = v;
      if(lowerCaseName.endsWith(".nefdbgnfo"))  nefdbgnfo = v;
    })
    // if (manifest === undefined){
    //   alert("No .manifest.json");
    //   return;
    // }
    // if (nef === undefined){
    //   alert("No .nef");
    //   return;
    // }
    // files.sort((a, b) => a === undefined ? 1 : a > b ? 1 : 0);
    // let [manifest, nef, dumpnef, nefdbgnfo] = [files[0], files[1], files[2], files[3]];
    this.importFromFile(manifest, nef, dumpnef, nefdbgnfo)
  }
  importFromFile(manifest, nef, dumpnef, nefdbgnfo){
    // console.log(nef, manifest, dumpnef, nefdbgnfo);
    let args = {};
    Promise.resolve().then(() => {
      if (manifest !== undefined){
        let reader = new FileReader();  reader.onload = (e) => {
            args.manifest = e.target.result;
            var json = JSON.parse(args.manifest);
            args.name = json["name"];
        };
        reader.readAsText(manifest);
      }
    }).then(() => {
      if (nef !== undefined){
        let reader = new FileReader();  reader.onload = (e) => {
            args.nef = window.btoa(  // base64
                new Uint8Array(e.target.result)
                    .reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
        };
        reader.readAsArrayBuffer(nef);
      }
    }).then(() => {
      if (dumpnef !== undefined){
        let reader = new FileReader();  reader.onload = (e) => {
          args.dumpnef = e.target.result;
        };
        reader.readAsText(dumpnef);
      }
    }).then(() => {
      if (nefdbgnfo !== undefined){
        let reader = new FileReader();  reader.onload = (e) => {
            args.nefdbgnfo = window.btoa(  // base64
                new Uint8Array(e.target.result)
                    .reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
          };
          reader.readAsArrayBuffer(nefdbgnfo);
      }
    }).then(() => {
        // todo: name, ... in args
        SingleContract.saveToStorage(args);
    });
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

    //    this.name = props.name;
    //    this.scriptHash = props.scriptHash;
    //    this.nef = props.nef;  // base64 string
    //    this.manifest = props.manifest;
    //    this.dumpnef = props.dumpnef;
    //    this.nefdbgnfo = props.nefdbgnfo;  // base64 string
    }

    static saveToStorage(props) {
        if (typeof (props.name) !== "string") throw "Invalid contract name!";
        let fairyContracts = JSON.parse(localStorage.getItem("fairyContracts"));
        if (fairyContracts === null || fairyContracts === undefined)
            fairyContracts = {};
        delete fairyContracts.undefined;
        let oldContract = fairyContracts[props.name];
        if (oldContract === null || oldContract === undefined)
            oldContract = {};
        oldContract.name = props.name;
        oldContract.scriptHash = props.scriptHash ?? oldContract.scriptHash;
        oldContract.nef = props.nef ?? oldContract.nef;
        oldContract.manifest = props.manifest ?? oldContract.manifest;
        oldContract.dumpnef = props.dumpnef ?? oldContract.dumpnef;
        oldContract.nefdbgnfo = props.nefdbgnfo ?? oldContract.nefdbgnfo;
        fairyContracts[props.name] = oldContract;
        localStorage.setItem("fairyContracts", JSON.stringify(fairyContracts));
        console.log(`Saved contract ${props.name}:`, fairyContracts[props.name]);
    }

    static loadFromStorage(name) {
        let contractJson = JSON.parse(localStorage.getItem("fairyContracts"))[name];
        return new SingleContract(contractJson)
    }

  render() {
    return(
        <div className="SingleContract">
            {this.name}
        </div>
    )
  }
}

class ManageContracts extends Component{
    static allContracts() {
        return Object.values(JSON.parse(localStorage["fairyContracts"])).map(v => new SingleContract(v));
    }

    render() {
        const contracts = ManageContracts.allContracts();
        return (
            <div className="ManageContracts" id="manageContracts">Contracts
                {contracts.map(({ name, scriptHash, nef }) => (
                    <p>{name}</p>
                ))}
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