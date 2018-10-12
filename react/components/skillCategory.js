import React, { Component } from 'react';

class skillCategory extends Component {
    constructor(props) {
        super(props)
    }

    render() {
        return(
            <tr>
                <td scope="row">{this.props.skill.name}</td>
                <td><button className="btn btn-sm btn-info" onClick={this.props.onView}><i className="fas fa-eye"></i></button></td>
            </tr>
        )
    }
}

export default skillCategory;