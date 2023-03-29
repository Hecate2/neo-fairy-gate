import {Component} from "react";
import "./index.css"

class Upload extends Component{
    render() {
        return (
            <span className="Upload">
                <label className="MultiFileUpload">
                    <input type="file" multiple="multiple" accept=".nef,.nef.txt,.manifest.json,.nefdbgnfo"/>
                    {/*<input type="file" multiple="multiple" webkitdirectory=""/>*/}
                    UPLOAD
                </label>
            </span>
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