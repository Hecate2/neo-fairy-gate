import { Component, createRef } from "react";
import { ClusterOutlined, EditOutlined } from "@ant-design/icons";
import "./index.css";

class LeftMenuItem extends Component {
    constructor(props) {
        super(props);
        this.icon = props.icon;
        this.text = props.text;
        this.homepage = props.homepage;
        this.active = props.active;
        this.hiddenLeft = false;
        this.onClick = this.onClick.bind(this);
        this.hideOrShowText = this.hideOrShowText.bind(this);
    }

    onClick() {
        const url = this.homepage + "/#/" + this.text.toLowerCase();
        if (window.ctrlKey) window.open(url);
        else {
            [...document.getElementById("leftMenu").children].forEach((v) => {
                if (v.id === this.text) v.className = "LeftMenuItemSelected";
                else v.className = "LeftMenuItem";
            });
            this.active = true;
            document.getElementById("workSpace").src = url;
        }
    }

    hideOrShowText() {
        this.hiddenLeft = !this.hiddenLeft;
        this.forceUpdate();
    }

    render() {
        return (
            <div
                id={this.text}
                key={this.text}
                className={this.active ? "LeftMenuItemSelected" : "LeftMenuItem"}
                onClick={this.onClick}
            >
                {this.icon.render()} {this.hiddenLeft ? "" : this.text}
            </div>
        );
    }
}

class LeftMenu extends Component {
    constructor(props) {
        super(props);
        this.homepage = props.homepage;
        this.onRightClick = this.onRightClick.bind(this);
        this.refs = [createRef(), createRef()];
    }

    onRightClick(e) {
        e.preventDefault();
        this.refs.forEach((v) => v.current.hideOrShowText());
    }

    render() {
        return (
            <div className={"LeftMenu"} id={"leftMenu"} onContextMenu={this.onRightClick}>
                <LeftMenuItem
                    icon={EditOutlined}
                    text={"Contracts"}
                    homepage={this.homepage}
                    active={true}
                    ref={this.refs[0]}
                />
                <LeftMenuItem icon={ClusterOutlined} text={"Test"} homepage={this.homepage} active={false} ref={this.refs[1]} />
            </div>
        );
    }
}

export default LeftMenu;