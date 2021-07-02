import React from 'react'
// import styles from './styles.css'
import PropTypes from 'prop-types'

let jsmeIsLoaded = false;
const jsmeCallbacks = {};

// Export the setup function so that a user can override the super-lazy loading behaviour and choose to load it more eagerly.
export function setup(src = "https://innowadetech.github.io/jsme-editor.github.io/dist/jsme/jsme.nocache.js") {
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
    this.markedAtoms = this.props.markAtoms;
    this.markedBonds = this.props.markBonds;
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
      if (this.props.molFile) {
        await this.jsmeApplet.readMoleFile(this.props.molFile)
      }

      // mol File can be marked without callback needed
      if (this.props.molFile) {
        if (this.props.markAtoms) {
          this.jsmeApplet.resetAtomColors(0)
          this.atomMarker(this.props.markAtoms);
        }
        if (this.props.markBonds) {
          this.jsmeApplet.resetBondColors(0);
          this.jsmeApplet.setBondBackgroundColors(0, this.props.markBonds);
        }
      }
      // set actionCode to select menu item 
      if (this.props.actionCode) {
        this.jsmeApplet.setAction(parseInt(this.props.actionCode));
      }
    })();
  }

  // atomHighlight function callback
  atomHighLighted = (jsmeEvent) => {
    if (this.props.atomHighlight) {
      this.props.atomHighlighted(jsmeEvent.atom)
    }
  }

  // mark atoms with molfile to keep consistent with gui marking instead of set backgroundColor
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
        molList[num] += `:${atomList[i+1]}`
    }
    mol2 = molList.join(' ')
    this.jsmeApplet.readGenericMolecularInput(mol2, true);
  }

  // bondHighlight function callback
  bondHighLighted = (jsmeEvent) => {
    if (this.props.bondHighlighted) {
      this.props.bondHighlighted(jsmeEvent.bond)
    }
  }

  //atomClick function callback
  atomClicked = (jsmeEvent) => {
    if (this.props.atomClicked) {
      this.props.atomClicked(jsmeEvent.atom)
    }
  }

  // bondClick function callback
  bondClicked = (jsmeEvent) => {
    if (this.props.bondClicked) {
      this.props.bondClicked(jsmeEvent.bond)
    }
  }

  // molecule update callback functions
  handleChange = (jsmeEvent) => {
    // update atom and bond markers for smiles file on startup
    if (jsmeEvent.action == "readSMILES" && this.load == true) {
      this.load = false;
      if (this.props.markAtoms) {
        this.jsmeApplet.resetAtomColors(0)
        this.atomMarker(this.props.markAtoms);
      }
      if (this.props.markBonds) {
        this.jsmeApplet.resetBondColors(0)
        this.jsmeApplet.setBondBackgroundColors(0, this.props.markBonds);
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

    // get bond color information from src since not in jsmeEvent
      if (jsmeEvent.src.g.b.p && parseInt(jsmeEvent.bond) > 0) {
        info.bondColor = jsmeEvent['src']['g']['b']['p']['c'][jsmeEvent.bond]['x'][0];
      }
      this.props.atomEvent(info)
    }
    // molecule update function callback
    if (this.props.onChange) {
      this.props.onChange(jsmeEvent.src.smiles(),jsmeEvent.src.molFile());
    }
    // marked Bonds list
    if (jsmeEvent.action == 'markBond' || jsmeEvent.action == 'unMarkBond') {
      // get bond color from src since not in jsmeEvent
      let bondColor = jsmeEvent['src']['g']['b']['p']['c'][jsmeEvent.bond]['x'];
      let marked = this.markedBonds.split(',');
      for (let i=0;i<marked.length;i+=2) {
          marked.splice(i,2)
        }
      if (jsmeEvent.action == 'markBond') {
        marked.push(jsmeEvent.bond);
        marked.push(bondColor[0]);
      }
      this.markedBonds = marked.join();
      if (this.props.bondsMarked) {
        this.props.bondsMarked(this.markedBonds);
      }
    }
    // marked Atoms list
    if (jsmeEvent.action == 'markAtom' || jsmeEvent.action == 'unMarkAtom') {
      let atomColor = jsmeEvent.atomBackgroundColorIndex;
      let marked = this.markedAtoms.split(',');
      for (let i=0;i<marked.length;i+=2) {
        if (marked[i] == jsmeEvent.atom.toString()) {
            marked.splice(i,2)
        }
      }
      if (jsmeEvent.action == 'markAtom') {
        marked.push(jsmeEvent.atom);
        marked.push(atomColor);
      }
      this.markedAtoms = marked.join();
      if (this.props.atomsMarked) {
        this.props.atomsMarked(this.markedAtoms);
      }
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
      if (this.props.markAtoms != prevProps.markAtoms) {
        this.jsmeApplet.resetAtomColors(0);
        this.atomMarker(this.props.markAtoms);
        this.markedAtoms = this.props.markAtoms;
      }
      if (this.props.markBonds != prevProps.markBonds) {
        this.jsmeApplet.resetBondColors(0);
        this.jsmeApplet.setBondBackgroundColors(0, this.props.markBonds);
        this.markedBonds = this.props.markBonds;
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
  atomHighlighted: PropTypes.func,
  bondHighlighted: PropTypes.func,
  atomClicked: PropTypes.func,
  bondClicked: PropTypes.func,
  atomsMarked: PropTypes.func,
  bondsMarked: PropTypes.func,
  markAtoms: PropTypes.string,
  markBonds: PropTypes.string,
  actionCode: PropTypes.number,
}
