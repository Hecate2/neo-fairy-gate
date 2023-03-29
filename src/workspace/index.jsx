import React, {Component} from "react";

class WorkSpace extends Component{
    constructor(props) {
        super(props);
        this.workSpace = React.createRef();
        this.homepage = props.homepage;
    }

    render() {
        return (
            <iframe
                src={this.homepage + "/#/contracts"}
                style={{gridArea: "main", border: 0, padding: 0, width: "100%", height: "100%"}}
                id={"workSpace"} className={"WorkSpace"} title={"workSpace"} ref={this.workSpace}>
                Loading...
            </iframe>
        );
    }
}

export default WorkSpace