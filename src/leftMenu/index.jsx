import {Component} from "react";
import {ClusterOutlined, EditOutlined} from "@ant-design/icons";
import "./index.css"

class LeftMenuItem extends Component{
    constructor(props) {
        super(props);
        this.icon = props.icon;
        this.text = props.text;
        this.onClick = props.onClick;
        this.backgroundColor = "inherit"
    }

    render() {
        return(
            <div className={"LeftMenuItem"} onClick={this.onClick}>
                {this.icon.render()} {this.text}
            </div>
        )
    }
}

class LeftMenu extends Component {
    render() {
        let menuItems = [
            new LeftMenuItem({icon: EditOutlined, text: "Cotracts"}),
            new LeftMenuItem({icon: ClusterOutlined, text: "Test"}),
        ]
        return(
            <div className={"LeftMenu"}>
                {menuItems.map((v) => <>{v.render()}</>)}
            </div>
        );
    }
}

export default LeftMenu;