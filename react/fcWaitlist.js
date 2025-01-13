import React from 'react';
import FleetInfo from 'components/fcFleetInfo';
import FleetGlance from 'components/fcFleetGlance';
import ReactDOM from 'react-dom';

const FleetEndpoint = "/internal-api/v2/fleet/"
const MaxFailures = 10;

class FcWaitlist extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            failures: 0,    
            backingOff: false,
            fleetData: {}
        }
    }

    fleetUpdate() {
        if(this.state.backingOff) {
            let failures = this.state.failures - 1;
            let backingOff = true;

            if(failures <= 0) {
                backingOff = false;
            }

            this.setState({failures: failures, backingOff: backingOff});

            if(backingOff) {
                return;
            }
        }

        if(!this.state.fleetID){
            return;
        }

        $.ajax({
            url: FleetEndpoint + this.state.fleetID,
            method: 'get'
        }).done((data)=>{
            this.setState({fleetData: data, failures: 0});
        }).fail((err) => {
            if(err.status == 404){
                console.log("FAILING")
                location.replace('/commander/0');
                return;
            }
            
            let failures = this.state.failures;
            let backingOff = false;
            if(failures + 1 >= MaxFailures) {
                backingOff = true;
            }

            this.setState({failures: failures + 1, backingOff: backingOff});
        });
    }
    
    componentDidMount() {
        if(!$('meta[name=fleetID]').attr("content")) {
            location.reload();
            return;
        }

        this.setState({fleetID: $('meta[name=fleetID]').attr("content")}, () => {
            this.fleetUpdate();
        });

        setInterval(this.fleetUpdate.bind(this), 10 * 1000);
        setTimeout(() => $('[data-toggle="tooltip"]').tooltip('dispose').tooltip())
    }

    componentDidUpdate() {
        setTimeout(() => $('[data-toggle="tooltip"]').tooltip('dispose').tooltip())
    }

    getFleetGlance() {
        if(!!this.state.fleetData.info) {
            return this.state.fleetData.info.glance;
        }

        return null;
    }

    render() {
        let fleetInfo;
        if(!!this.state.fleetData.info){
            fleetInfo = <FleetInfo info={this.state.fleetData.info} fleetID={this.state.fleetID} updateFunc={this.fleetUpdate.bind(this)} />
        }

        let offlineBanner;
        if(!!this.state.fleetData.info && !this.state.fleetData.info.fc){
            offlineBanner = (
                <div role="alert" className="alert alert-primary global-banner-inactive noselect">
                    <strong>ESI Fleet Disabled |</strong> You must set a new FC (Boss) before you can send invites.<br/>Use !esi in FC Jabber. If esi-fleets is yellow or red this issue may persist.
                </div>
            );
        }

        let notListedBanner;
        if(!!this.state.fleetData.info && this.state.fleetData.info.status == 'Not Listed'){
            notListedBanner = (
                <div role="alert" className="alert alert-primary global-banner-inactive noselect">
                    <strong>This fleet is not listed:</strong> Pilots cannot see this fleet. If this is the only fleet pilots will be unable to join the waitlist!
                </div>
            );
        }
        
        return(
            <div>
                {offlineBanner}
                {notListedBanner}

                <section className="no-padding-top no-padding-bottom">
                    <div className="container-fluid">
                        <div className="row">
                            <div className="col-lg-6 col-md-12 col-sm-12">
                                {fleetInfo}
                            </div>
                            
                            <div className="col-lg-6 col-md-12 col-sm-12">
                                <FleetGlance glance={this.getFleetGlance()} />
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        );
    }
}

console.log("Attaching to dom!");
const reactAttach = document.querySelector('#react-fcWaitlist-attach')
ReactDOM.render(<FcWaitlist />, reactAttach);
