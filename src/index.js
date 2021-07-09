import React from 'react'
// import styles from './styles.css'
import PropTypes from 'prop-types'

let jsmeIsLoaded = false;
const jsmeCallbacks = {};

// Export the setup function so that a user can override the super-lazy loading behaviour and choose to load it more eagerly.
export function setup(src = "https://unpkg.com/jsme-editor/jsme.nocache.js") {
  const script = document.createElement('script');
  script.src = src;
  document.head.appendChild(script);

  window.jsmeOnLoad = () => {
    Object.values(jsmeCallbacks)
      .forEach(f => f());
    jsmeIsLoaded = true;
  }
}

// Pure Component to reduce unnecessary renders due to issue with jsme editor molecule duplication
export class Jsme extends React.PureComponent {
  constructor(props) {
    super(props)
    this.myRef = React.createRef()
    this.id = `jsme${this.props.id}`;
    this.load = true
  }

  handleJsmeLoad = () => {
    // new jsmeApplet
    this.jsmeApplet = new window.JSApplet.JSME(this.id, this.props.width, this.props.height, 
      { options: this.props.options } );

    // assign callbacks
    this.jsmeApplet.setCallBack("AfterStructureModified", this.handleChange);
    this.jsmeApplet.setCallBack("AtomHighlight", this.atomHover);
    this.jsmeApplet.setCallBack("BondHighlight", this.bondHover);
    this.jsmeApplet.setCallBack("AtomClicked", this.atomClick);
    this.jsmeApplet.setCallBack("BondClicked", this.bondClick);
    // Need to read smiles with function so can mark Atoms and Bonds on callback
    if (this.props.smiles.string) {
      this.jsmeApplet.readGenericMolecularInput(this.props.smiles.string, true);
    }
    // set actionCode to select menu item 
    if (this.props.actionCode) {
      this.jsmeApplet.setAction(parseInt(this.props.actionCode));
    }
  }

  // atomHover callback function
  atomHover = (jsmeEvent) => {
    if (this.props.atomHover) {
      this.props.atomHover(jsmeEvent.atom)
    }
  }

  // atomClick callback function
  atomClick = (jsmeEvent) => {
    if (this.props.atomClick) {
      this.props.atomClick(jsmeEvent.atom)
    }
  }

  // mark atoms background color function
  atomsMark = (atoms) => {
    this.jsmeApplet.resetAtomColors(0);
    this.jsmeApplet.setAtomBackgroundColors(0, atoms);
  }

  // bondHighlight function callback
  bondHover = (jsmeEvent) => {
    if (this.props.bondHover) {
      this.props.bondHover(jsmeEvent.bond)
    }
  }

  // bondClick function callback
  bondClick = (jsmeEvent) => {
    if (this.props.bondClick) {
      this.props.bondClick(jsmeEvent.bond)
    }
  }

  // mark bonds background color function
  bondsMark = (bonds) => {
    this.jsmeApplet.resetBondColors(0);
    this.jsmeApplet.setBondBackgroundColors(0, bonds);
  }

  // update molecule function
  updateMolecule = (molecule) => {
    this.jsmeApplet.readGenericMolecularInput(molecule, true);
  }

  // molecule update callback functions
  handleChange = (jsmeEvent) => {
    // update atom and bond markers for smiles file on startup
    if (this.load) {
      if (jsmeEvent.action == "readSMILES") {
        this.load = false;
        if (this.props.atomsMark.string) {
          this.atomsMark(this.props.atomsMark.string);
        }
        if (this.props.bondsMark.string) {
          this.bondsMark(this.props.bondsMark.string);
        }
      }
    }
    // return event information
    if (this.props.jmeEvent) {
      let info = {'action': jsmeEvent.action,
                  'atom': jsmeEvent.atom,
                  'color': jsmeEvent.atomBackgroundColorIndex,
                  'bond': jsmeEvent.bond,
                  'bondColor': 0,
                  'molecule': jsmeEvent.molecule,
                  'origin': jsmeEvent.origin,
                  'totalBonds': this.jsmeApplet.totalNumberOfBonds(),
                  'totalAtoms': this.jsmeApplet.totalNumberOfAtoms(),
                }
    // get bond color information from src since not in jsmeEvent
      if (jsmeEvent.src.g.b.p && parseInt(jsmeEvent.bond) > 0 && jsmeEvent.action == 'markBond') {
        info.bondColor = jsmeEvent['src']['g']['b']['p']['c'][jsmeEvent.bond]['x'][0];
      }
      this.props.jmeEvent(info)
    }
    // molecule update function callback
    if (this.props.onChange) {
      this.props.onChange(jsmeEvent.src.smiles());
    }
  }

  // load script and jsmeApplet on mount
  componentDidMount() {
    if (jsmeIsLoaded) {
      this.handleJsmeLoad();
    } else {
      if (!window.jsmeOnLoad) {
        setup(this.props.src);
      }
      jsmeCallbacks[this.id] = this.handleJsmeLoad;
    }

  }

  //unset callbacks on unmount
  componentWillUnmount() {
    jsmeCallbacks[this.id] = undefined;
  }
  
  //Update jsmeApplet 
  componentDidUpdate(prevProps) {
    if (this.jsmeApplet !== undefined && this.jsmeApplet !== null) {
      if (this.props.height !== prevProps.height || this.props.width !== prevProps.width) {
        this.jsmeApplet.setSize(this.props.width, this.props.height)
      }
      if (this.props.options !== prevProps.options) {
        this.jsmeApplet.options({options: this.props.options})
      }
      if (this.props.smiles !== prevProps.smiles) {
        this.jsmeApplet.readGenericMolecularInput(this.props.smiles.string, true);
      }
      if (this.props.lineWidth !== prevProps.lineWidth) {
        this.jsmeApplet.setMolecularAreaLineWidth(this.props.lineWidth);
      }
      if (this.props.atomsMark != prevProps.atomsMark) {
        this.atomsMark(this.props.atomsMark.string);
      }
      if (this.props.bondsMark != prevProps.bondsMark) {
        this.bondsMark(this.props.bondsMark.string);
      }
      if (this.props.actionCode != prevProps.actionCode && this.props.actionCode !== null) {
        this.jsmeApplet.setAction(parseInt(this.props.actionCode));
      }
    }
  }

  render() {
    return <div ref={this.myRef} id={this.id}></div>
  }
}

Jsme.propTypes = {
  id: PropTypes.string,
  height: PropTypes.string.isRequired,
  width: PropTypes.string.isRequired,
  smiles: PropTypes.object,
  options: PropTypes.string,
  onChange: PropTypes.func,
  jmeEvent: PropTypes.func,
  src: PropTypes.string,
  lineWidth: PropTypes.number,
  atomHover: PropTypes.func,
  bondHover: PropTypes.func,
  atomClick: PropTypes.func,
  bondClick: PropTypes.func,
  atomsMark: PropTypes.object,
  bondsMark: PropTypes.object,
  actionCode: PropTypes.number,
}
