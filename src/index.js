import React from 'react'
// import styles from './styles.css'
import PropTypes from 'prop-types'

let jsmeIsLoaded = false;
const jsmeCallbacks = {};

// Export the setup function so that a user can override the super-lazy loading behaviour and choose to load it more eagerly.
export function setup(src = "https://jsme.cloud.douglasconnect.com/JSME_2017-02-26/jsme/jsme.nocache.js") {
  const script = document.createElement('script');
  script.src = src;
  document.head.appendChild(script);

  window.jsmeOnLoad = () => {
    Object.values(jsmeCallbacks)
      .forEach(f => f());
    jsmeIsLoaded = true;
  }
}

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
      { mol: this.props.molFile, options: this.props.options } );

    // assign callbacks
    this.jsmeApplet.setCallBack("AfterStructureModified", this.handleChange);
    this.jsmeApplet.setCallBack("AtomHighlight", this.atomHighLight);
    this.jsmeApplet.setCallBack("BondHighlight", this.bondHighLight);
    this.jsmeApplet.setCallBack("AtomClicked", this.atomClick);
    this.jsmeApplet.setCallBack("BondClicked", this.bondClick);
    ( async () => {
      // Need to read smiles with function so can  mark Atoms and Bonds on callback
      if (this.props.smiles) {
      await this.jsmeApplet.readGenericMolecularInput(this.props.smiles, true);
      }

      // mol File can be marked without callback needed
      if (this.props.molFile) {
        if (this.props.atomsMarked) {
          this.jsmeApplet.resetAtomColors(0)
          this.atomMarker(this.props.atomsMarked);
        }
        if (this.props.bondsMarked) {
          console.log(this.props.bondsMarked)
          this.jsmeApplet.resetBondColors(0);
          this.jsmeApplet.setBondBackgroundColors(0, this.props.bondsMarked);
        }
      }
      if (this.props.actionCode) {
        this.jsmeApplet.setAction(parseInt(this.props.actionCode));
      }
    })();
  }

  // atomHIghlight function callback
  atomHighLight = (jsmeEvent) => {
    if (this.props.atomHighlight) {
      this.props.atomHighlight(jsmeEvent.atom)
    }
  }

  // mark atoms with molfile to keep consistent with gui marking
  atomMarker = (atoms) => {
    let mol = this.jsmeApplet.jmeFile();
    let molList = mol.split(' ');
    let atomList = atoms.split(',');
    let mol2 = '';
    for (let i=2;i<molList[0];i+=3) {
        molList[i] = molList[i][0]
    }
    for (let i = 0; i < atomList.length; i +=2) {
        let num = 3 * parseInt(atomList[i]) -1 
        console.log(num)
        molList[num] += `:${atomList[i+1]}`
    }
    mol2 = molList.join(' ')
    this.jsmeApplet.readMolecule(mol2);
  }

  // bondHighlight function callback
  bondHighLight = (jsmeEvent) => {
    if (this.props.bondHighlight) {
      this.props.bondHighlight(jsmeEvent.bond)
    }
  }

  //atomClick function callback
  atomClick = (jsmeEvent) => {
    if (this.props.atomClick) {
      this.props.atomClick(jsmeEvent.atom)
    }
  }

  // bondClick function callback
  bondClick = (jsmeEvent) => {
    console.log(jsmeEvent);
    if (this.props.bondClick) {
      this.props.bondClick(jsmeEvent.bond)
    }
  }

  // molecule update callback functions
  handleChange = (jsmeEvent) => {
    // update atom and bond markers for smiles file on startup
    if (jsmeEvent.action == "readSMILES" && this.load == true) {
      if (this.props.atomsMarked) {
        this.load = false;
        this.jsmeApplet.resetAtomColors(0)
        this.atomMarker(this.props.atomsMarked);
      }
      if (this.props.bondsMarked) {
        this.jsmeApplet.resetBondColors(0)
        this.jsmeApplet.setBondBackgroundColors(0, this.props.bondsMarked);
      }
    }
    // return event information
    if (this.props.atomEvent) {
      let info = {'action': jsmeEvent.action,
                  'atom': jsmeEvent.atom,
                  'color': jsmeEvent.atomBackgroundColorIndex,
                  'bond': jsmeEvent.bond,
                  'bondColor': 0,
                  'molecule': jsmeEvent.molecule,
                  'origin': jsmeEvent.origin,
                }

    // get bond color information
    if (jsmeEvent.src.g.b.p && parseInt(jsmeEvent.bond) > 0) {
      info.bondColor = jsmeEvent['src']['g']['b']['p']['c'][jsmeEvent.bond]['x'][0];
      console.log(jsmeEvent['src']['g']['b']['p']['c'][jsmeEvent.bond]['x'])
    }
      this.props.atomEvent(info)
    }
    // molecule update function callback
    if (this.props.onChange) {
      this.props.onChange(jsmeEvent.src.smiles(),jsmeEvent.src.molFile());
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

  //unset callbs on unmount
  componentWillUnmount() {
    jsmeCallbacks[this.id] = undefined;
  }

  // update jsmeApplet if props changed
  componentDidUpdate(prevProps) {
    if (this.jsmeApplet !== undefined && this.jsmeApplet !== null) {
      if (this.props.height !== prevProps.height || this.props.width !== prevProps.width) {
        this.jsmeApplet.setSize(this.props.width, this.props.height)
      }
      if (this.props.options !== prevProps.options) {
        this.jsmeApplet.options({options: this.props.options})
      }
      if (this.props.smiles !== prevProps.smiles) {
        this.jsmeApplet.readGenericMolecularInput(this.props.smiles)
      }
      if (this.props.molFile !== prevProps.molFile) {
        this.jsmeApplet.readMolFile(this.props.molFile)
      }
      if (this.props.lineWidth !== prevProps.lineWidth) {
        this.jsmeApplet.setMolecularAreaLineWidth(this.props.lineWidth);
      }
      if (this.props.atomsMarked != prevProps.atomsMarked) {
        this.jsmeApplet.resetAtomColors(0)
        this.atomMarker(this.props.atomsMarked);
        // this.jsmeApplet.setAtomBackgroundColors(0, this.props.atomsMarked);
      }
      if (this.props.bondsMarked != prevProps.bondsMarked) {
        console.log(this.props.bondsMarked)
        this.jsmeApplet.resetBondColors(0)
        this.jsmeApplet.setBondBackgroundColors(0, this.props.bondsMarked);
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
  smiles: PropTypes.string,
  molFile: PropTypes.string,
  options: PropTypes.string,
  onChange: PropTypes.func,
  atomEvent: PropTypes.func,
  src: PropTypes.string,
  lineWidth: PropTypes.number,
  atomHighlight: PropTypes.func,
  bondHighlight: PropTypes.func,
  atomClick: PropTypes.func,
  bondClick: PropTypes.func,
  atomsMarked: PropTypes.string,
  bondsMarked: PropTypes.string,
  actionCode: PropTypes.number,
}
