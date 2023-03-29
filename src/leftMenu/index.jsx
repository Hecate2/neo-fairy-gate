import {Component} from "react";
import {ClusterOutlined, EditOutlined} from "@ant-design/icons";
import "./index.css"

class LeftMenuItem extends Component{
    constructor(props) {
        super(props);
        this.icon = props.icon;
        this.text = props.text;
        this.homepage = props.homepage;
        this.onClick = () => {
            const url = this.homepage + "/#/" + this.text.toLowerCase();
            if (window.ctrlKey)
                window.open(url);
            else
                document.getElementById("workSpace").src = url;
        };
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
    constructor(props) {
        super(props);
        this.homepage = props.homepage;
        this.menuItems = [
            new LeftMenuItem({icon: EditOutlined, text: "Contracts", homepage: this.homepage}),
            new LeftMenuItem({icon: ClusterOutlined, text: "Test", homepage: this.homepage}),
        ]
    }
    render() {
        return(
            <div className={"LeftMenu"}>
                {this.menuItems.map((v) => <>{v.render()}</>)}
            </div>
        );
    }
}

export default LeftMenu;