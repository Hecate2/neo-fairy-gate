import React, {Component} from "react";
import { SwapOutlined } from "@ant-design/icons";
import { FairyClient } from "../libs/NeoFairyClient"
import "./index.css"

let colorWhite = "#FFFFFF";
let colorBlack = "#000000";
let colorGreen = "#B4CFA6";
let colorYellow = "#EDC893";
let colorRed = "#BF2930";

class ServerSelect extends Component {
    constructor(props) {
        super(props);
        this.header = React.createRef();
        this.activeServer = React.createRef();
        this.activeServerComment = React.createRef();
        this.standbyServer = React.createRef();
        this.standbyServerComment = React.createRef();
        this.switchButton = React.createRef();
        this.testButton = React.createRef();
        this.state = {
            activeServer: new URL(localStorage["fairyActiveServer"] ?? "http://localhost:16868"),
            standbyServer: new URL(localStorage["fairyStandbyServer"] ?? "http://localhost:26868"),
            runningTests: []
        }
        this.headerHideHeight = "2.4em";
        this.hideHeader = this.hideHeader.bind(this)
        this.showHeader = this.showHeader.bind(this)
        this.hideOrShowHeader = this.hideOrShowHeader.bind(this)
        this.switchServer = this.switchServer.bind(this)
        this.testServer = this.testServer.bind(this)
        this.onActiveServerTextChange = this.onActiveServerTextChange.bind(this)
        this.onStandbyServerTextChange = this.onStandbyServerTextChange.bind(this)
    }

    onActiveServerTextChange(event){
        try{
            this.activeServer.current.style.color = colorBlack
            this.setState({activeServer: new URL(event.target.value)});
            this.testServer();
        }catch (e){
            this.activeServer.current.style.color = colorRed
            // this.activeServer.current.render()
        }
    }

    onStandbyServerTextChange(event){
        try {
            this.standbyServer.current.style.color = colorBlack
            this.setState({standbyServer: new URL(event.target.value)});
            this.testServer();
        }catch (e){
            this.standbyServer.current.style.color = colorRed
            // this.standbyServer.current.render()
        }
    }

    async switchServer(){
        let activeServer = new URL(this.activeServer.current.value);
        let standbyServer = new URL(this.standbyServer.current.value);
        this.activeServer.current.value = standbyServer.toString();
        this.standbyServer.current.value = activeServer.toString();
        [this.activeServerComment.current.value, this.standbyServerComment.current.value] = [this.standbyServerComment.current.value, this.activeServerComment.current.value];
        [this.activeServerComment.current.style.backgroundColor, this.standbyServerComment.current.style.backgroundColor] = [this.standbyServerComment.current.style.backgroundColor, this.activeServerComment.current.style.backgroundColor];
        this.setState({
            activeServer: standbyServer,
            standbyServer: activeServer
        })
        await this.testServer();
    }

    async testServer(){
        this.testButton.current.disabled = true;
        this.switchButton.current.disabled = true;
        this.testButton.current.innerHTML = "TEST...";
        this.activeServerComment.current.style.backgroundColor = colorWhite;
        this.standbyServerComment.current.style.backgroundColor = colorWhite;
        let _this = this;
        await Promise.all([
            new FairyClient({ target_url: this.activeServer.current.value }).list_snapshots().then(
                function (resolve) {
                    localStorage["fairyActiveServer"] = _this.activeServer.current.value.toString();
                    //if (resolve.status === 200 && resolve.ok)
                        _this.activeServerComment.current.style.backgroundColor = colorGreen;
                //    else
                //        _this.activeServerComment.current.style.backgroundColor = colorYellow;
                },
                function (reject) {
                    _this.activeServerComment.current.style.backgroundColor = colorRed;
                }
            ),
            new FairyClient({ target_url: this.standbyServer.current.value }).list_snapshots().then(
                function (resolve) {
                    localStorage["fairyStandbyServer"] = _this.standbyServer.current.value.toString();
                    //if(resolve.status === 200 && resolve.ok)
                        _this.standbyServerComment.current.style.backgroundColor = colorGreen;
                //    else
                //        _this.standbyServerComment.current.style.backgroundColor = colorYellow;
                },
                function (reject){
                    _this.standbyServerComment.current.style.backgroundColor = colorRed;
                }
            )
        ]);
        this.testButton.current.innerHTML = "TEST!";
        this.switchButton.current.disabled = false;
        this.testButton.current.disabled = false;
    }

    showHeader(){ this.header.current.style.overflow = "unset"; this.header.current.style.height = "max-content"; }
    hideHeader(){ this.header.current.style.overflow = "hidden"; this.header.current.style.height = this.headerHideHeight; }

    hideOrShowHeader(){
        if (this.header.current.style.height !== this.headerHideHeight)
            this.hideHeader();
        else
            this.showHeader();
    }

    componentDidMount(){
        this.testServer();
    }

    render() {
        return (
            <header ref={this.header}>
            <div onClick={this.showHeader} className={"switch-server"} style={{display: "flex"}}>
                <span className={"server"} style={{display: "inline-block"}}>
                    <div><input id="activeServer" ref={this.activeServer} onBlur={this.onActiveServerTextChange} type={"text"} defaultValue={this.state.activeServer.toString()}/></div>
                    <div style={{textAlign: "center", backgroundColor: colorGreen, cursor: "not-allowed"}}>↑↑Active↑↑</div>
                    <div><input style={{textAlign: "center"}} ref={this.activeServerComment} type={"text"} defaultValue={"/*mainnet*/"}/></div>
                </span>
                <span>
                    <div style={{textAlign: "center"}}>
                        {/*<SwapLeftOutlined/>*/}
                        <button style={{textAlign: "center"}} ref={this.testButton} onClick={this.testServer}>TEST!</button>
                        {/*<SwapRightOutlined/>*/}
                    </div>
                    <div style={{textAlign: "center"}}><SwapOutlined/></div>
                    <div style={{textAlign: "center"}}>
                        <SwapOutlined/>
                        <button style={{textAlign: "center", cursor: "e-resize"}} ref={this.switchButton} onClick={this.switchServer}>SWITCH</button>
                        <SwapOutlined/>
                    </div>
                </span>
                <span className={"server"} style={{display: "inline-block"}}>
                    <div><input id="standbyServer" style={{backgroundColor: colorYellow}} ref={this.standbyServer} onBlur={this.onStandbyServerTextChange} type={"text"} defaultValue={this.state.standbyServer.toString()}/></div>
                    <div style={{textAlign: "center", backgroundColor: colorYellow, cursor: "not-allowed"}}>↑↑Standby↑↑</div>
                    <div><input style={{textAlign: "center"}} ref={this.standbyServerComment} type={"text"} defaultValue={"customComment"}/></div>
                </span>
            </div>
            <div style={{fontSize: "20px", backgroundColor: colorBlack, color: colorYellow}}>
                !!!<a href={"https://neo.org/converter/index"} style={{color: colorGreen}} target="_blank" rel="noreferrer">N3 DATA CONVERTER</a>!!!
            </div>
            <div onClick={this.hideHeader}>  {/*YES I am putting the function in the div instead of the button*/}
                <label>Connect to a <a href={"https://github.com/Hecate2/neo-fairy-test/"} target="_blank" rel="noreferrer">Fairy RPC server</a> before using!</label>
                <button>HIDE</button>
            </div>
            </header>
        );
    }
}

export default ServerSelect;