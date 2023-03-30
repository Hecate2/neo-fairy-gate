import {Component} from "react";
import {ImportOutlined, UploadOutlined} from "@ant-design/icons";
import "./index.css"

class Upload extends Component{
    render() {
        return (
            <div>
              <div>
              <label className="ContractMultiFileUpload">
                <span className="Upload">
                  <input type="file" multiple="multiple" accept=".nef,.nef.txt,.manifest.json,.nefdbgnfo"/>
                  {/*<input type="file" multiple="multiple" webkitdirectory=""/>*/}
                  <UploadOutlined /> UPLOAD FILES
                </span>
              </label>
              <div>
                Or IMPORT these contracts...
                <div>
                <textarea id="contractAddress" placeholder="0[xX][0-9a-fA-F]{40}"
                          style={{width: "336px", height: "28px", alignSelf: "center"}}/>
                </div>
              </div>
              </div>
              <label className="ContractImport">
                <span className="Upload">
                  <button/>
                  <ImportOutlined /> FROM ACTIVE
                </span>
              </label>
              <label className="ContractImport">
                <span className="Upload">
                  <button/>
                  <ImportOutlined /> FROM STANDBY
                </span>
              </label>
            </div>
        );
    }
}

class Contracts extends Component{
    render() {
        return (
            <div className={"Contracts"}>
                <Upload/>
            </div>
        );
    }
}

export default Contracts