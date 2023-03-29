import {Component} from "react";
import {ClusterOutlined, EditOutlined} from "@ant-design/icons";
import "./index.css"

class LeftMenuItem extends Component{
    constructor(props) {
        super(props);
        this.icon = props.icon;
        this.text = props.text;
        this.homepage = props.homepage;
        this.state = {active: !!props.active};
        this.onClick = this.onClick.bind(this);
    }

    onClick() {
        const url = this.homepage + "/#/" + this.text.toLowerCase();
        if (window.ctrlKey)
            window.open(url);
        else{
            [...document.getElementById("leftMenu").children].forEach(v => {
                if (v.id === this.text)
                    v.className = "LeftMenuItemSelected";
                else
                    v.className = "LeftMenuItem";
            })
            this.setState({active: true});
            document.getElementById("workSpace").src = url;
        }
    }

    render() {
        return(
            <div id={this.text} className={this.state.active ? "LeftMenuItemSelected" : "LeftMenuItem"} onClick={this.onClick}>
                {this.icon.render()} {this.text}
            </div>
        )
    }
}

class LeftMenu extends Component {
    constructor(props) {
        super(props);
        this.homepage = props.homepage;
        this.menuItems = [
            new LeftMenuItem({icon: EditOutlined, text: "Contracts", homepage: this.homepage, active: true}),
            new LeftMenuItem({icon: ClusterOutlined, text: "Test", homepage: this.homepage}),
        ]
    }
    render() {
        return(
            <div className={"LeftMenu"} id={"leftMenu"}>
                {this.menuItems.map((v) => <>{v.render()}</>)}
            </div>
        );
    }
}

export default LeftMenu;