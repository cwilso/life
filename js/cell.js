var theUniverse = null;
var frame1 = null,
	frame2 = null,
	currentFrame = null,
	backFrame = null;

var numRows = 8,
	numCols = 8;

var selectMIDIIn = null;
var selectMIDIOut = null;
var midiAccess = null;
var midiIn = null;
var midiOut = null;
var midiDeviceType = null; // should be purely informational
var midiDrawRoutine = null;

window.addEventListener('keydown', function() { tick(); } );

window.addEventListener('load', function() {
	theUniverse = document.getElementById("universe");
	frame1 = new Array(numRows);
	frame2 = new Array(numRows);

	for (var i=0; i<numRows; i++) {
		frame1[i] = new Array(numCols);
		frame2[i] = new Array(numCols);
		for (var j=0; j<numCols; j++) {
			frame1[i][j] = (Math.random() < 0.5);
			frame2[i][j] = false;
		}	
	}

	for (var i=0; i<numRows; i++) {
		var rowElem = document.createElement("div");
		rowElem.className = "row";
		rowElem.row = i;
		for (var j=0; j<numCols; j++) {
			var cellElem = document.createElement("div");
			cellElem.row = i;
			cellElem.col = j;
			cellElem.onclick = flipHandler;
			cellElem.className = "cell";
			if (frame1[i][j])
				cellElem.classList.add("live");
			rowElem.appendChild(cellElem);
		}
		theUniverse.appendChild(rowElem);
	}
	currentFrame = frame1;
	backFrame = frame2;
	navigator.requestMIDIAccess({sysex:true}).then( onMIDIInit, onMIDIFail );
} );

function changeMIDIIn( ev ) {
  if (midiIn)
    midiIn.onmidimessage = null;
  var selectedID = selectMIDIIn[selectMIDIIn.selectedIndex].value;

  for (var input of midiAccess.inputs.values()) {
    if (selectedID == input.id)
      midiIn = input;
  }
  midiIn.onmidimessage = midiProc;
}

function changeMIDIOut( ev ) {
  var selectedID = selectMIDIOut[selectMIDIOut.selectedIndex].value;

  for (var output of midiAccess.outputs.values()) {
    if (selectedID == output.id) {
    	  launchpadFound = (output.name.toString().indexOf("Launchpad") != -1);
    	  mkiiFound =  (output.name.toString().indexOf("Launchpad MK2") != -1);
    	  midiOut = output;
	  if (launchpadFound) {
	  	if (mkiiFound) {
	     		midiOut.send( [0xF0, 0x00, 0x20, 0x29, 0x02, 0x18, 022, 0x00, 0xF7] ); // Session layout
	  	} else {
	     		midiOut.send( [0xB0,0x00,0x00] ); // Reset Launchpad
			midiOut.send( [0xB0,0x00,0x01] ); // Select XY mode
	      }
	  }
	  drawFullBoardToMIDI();
	}
  }
}

function onMIDIFail( err ) {
    drawFullBoardToMIDI();
	alert("MIDI initialization failed.");
}

function selectIfLaunchpad( input ) {
	var name = input.name.toString();
	if (name == "Launchpad") {
		midiDeviceType = "Launchpad";
		input.onmidimessage = LaunchpadMIDIProc;
		midiDrawRoutine = drawLaunchpadOriginalPixel;
	} else if (name == "Launchpad Mini") {
		midiDeviceType = "Launchpad Mini";
		input.onmidimessage = LaunchpadMIDIProc;
		midiDrawRoutine = drawLaunchpadOriginalPixel;
	} else if (name == "Launchpad S") {
		midiDeviceType = "Launchpad S";
		input.onmidimessage = LaunchPadMIDIProc;
		midiDrawRoutine = drawLaunchpadOriginalPixel;
	} else if (name == "Launchpad MK2") {
		midiDeviceType = "Launchpad MK2";
		input.onmidimessage = LaunchPadProAndMKIIMIDIProc;
		midiDrawRoutine = drawLaunchpadMKIIPixel;
	} else if (name == "Launchpad Pro Standalone Port") {
		midiDeviceType = "Launchpad Pro";
		input.onmidimessage = LaunchPadProAndMKIIMIDIProc;
		midiDrawRoutine = drawLaunchpadProPixel;
	} else if (name == "QUNEO") {
		midiDeviceType = "QUNEO";
		input.onmidimessage = QuneoMIDIProc;
		midiDrawRoutine = drawQuneoPixel;
	}

	if (midiDeviceType) {
		if (midiIn) // if we already had a device selected, clear its handler.
			midiIn.onmidimessage = null;
		midiIn=input;
		return midiIn;
	}
	return null;
}

function onMIDIInit( midi ) {
	midiAccess = midi;
	selectMIDIIn=document.getElementById("midiIn");
	selectMIDIOut=document.getElementById("midiOut");

	for (var input of midiAccess.inputs.values()) {
		if (!midiIn)
			midiIn = selectIfLaunchpad(input);
		selectMIDIIn.add(new Option(input.name,input.id,(midiIn==input),(midiIn==input)));
	}
	selectMIDIIn.onchange = changeMIDIIn;

	var inputName = midiIn ? midiIn.name.toString() : null;
	for (var output of midiAccess.outputs.values()) {
		if (output.name.toString() == inputName) {
			selectMIDIOut.add(new Option(output.name,output.id,true,true));
			midiOut=output;
		} else
			selectMIDIOut.add(new Option(output.name,output.id,false,false));
    }
	selectMIDIOut.onchange = changeMIDIOut;

	if (midiOut)
		resetLaunchpad(midiOut);
	drawFullBoardToMIDI();
}

function resetLaunchpad( midiDeviceName ) {
	if ((midiDeviceName == "Launchpad")||(midiDeviceName == "Launchpad Mini")||(midiDeviceName == "Launchpad S")) {  
		midiOut.send( [0xB0,0x00,0x00] ); // Reset Launchpad
		midiOut.send( [0xB0,0x00,0x01] ); // Select XY mode
	} else if (midiDeviceName == "Launchpad MK2") {  
		midiOut.send( [0xF0,0x00,0x20,0x29,0x02,0x18,0x22,0x00,0xF7] ); // Session layout
		midiOut.send( [0xF0,0x00,0x20,0x29,0x02,0x10,0x0E,0x00,0xF7] ); // Set all LEDs to off
	} else if (midiDeviceName == "Launchpad Pro Standalone Port") {  
		midiOut.send( [0xF0,0x00,0x20,0x29,0x02,0x10,0x20,0x03,0xF7] ); // Set Launchpad Pro into Programmer mode
		midiOut.send( [0xF0,0x00,0x20,0x29,0x02,0x10,0x0E,0x00,0xF7] ); // Set all LEDs to off
	} else if (midiDeviceName == "QUNEO") {
		// ? TODO
	}
}

function drawLaunchpadProPixel(x,y,live,mature) {
	var key = 11 + (7-x)*10 + y;
	midiOut.send( [0x90, key, live ? (mature?0x60:0x10) : 0x00]);
}

function drawLaunchpadOriginalPixel(x,y,live,mature) {
	var key = x*16 + y;
	midiOut.send( [0x90, key, live ? (mature?0x13:0x30) : 0x00]);
}

function drawLaunchpadMKIIPixel(x,y,live,mature) {
	var key = 11 + (7-x)*10 + y;
	midiOut.send( [0x90, key, live ? (mature?0x09:0x10) : 0x00]);
}

function drawQuneoPixel(x,y,live,mature) {
	var key = 0 + (7-x)*16 + (y*2);
	midiOut.send( [0x91, key, live ? 0x7f : 0x00]);
	midiOut.send( [0x91, key+1, live ? (mature?0x7f:00) : 0x00]);
}

function flipHandler(e) {
	flip( e.target );
}

function flip(elem) {
	currentFrame[elem.row][elem.col] = !currentFrame[elem.row][elem.col];
	if (elem.className == "cell")  // dead
		elem.className = "cell live";
	else
		elem.className = "cell";
	if (midiDrawRoutine)
		midiDrawRoutine(elem.row,elem.col, elem.classList.contains("live"),elem.classList.contains("mature"));
	setDottiPixel(elem.row,elem.col,elem.classList.contains("mature")?255:0,elem.classList.contains("live")?255:0,0);
}

function findElemByXY( x, y ) {
	var e, i, j, c;

	for (i in theUniverse.children) {
		e = theUniverse.children[i];
		if (e.row == y) {
			for (j in e.children) {
				if (e.children[j].col == x)
					return e.children[j];
			}
		}
	}
	return null;
}

function flipXY( x, y ) {
	var elem = findElemByXY( x, y );
	if (elem)
		flip( elem );
}

function countLiveNeighbors(frame,x,y) {
	var c=0;

	for (var i=x-1; i<x+2; i++) {
		for (var j=y-1; j<y+2; j++) {
			if ((i!=x)||(j!=y)) {	// skip the cell itself
				if (frame[((i+numRows)%numRows)][((j+numCols)%numCols)])
					c++;
			}
		}
	}
	return c;
}

function drawFullBoardToMIDI() {
//	var t = window.performance.webkitNow();
	for (var i=0; i<numRows; i++) {
		for (var j=0; j<numCols; j++) {
			var elem = findElemByXY(j,i);
			if (midiDrawRoutine)
				midiDrawRoutine(i,j,currentFrame[i][j],elem.classList.contains("mature"));
		}	
	}

//	console.log( "draw took " + (window.performance.webkitNow() - t) + " ms.");
}

function updateMIDIFromLastFrame() {
	for (var i=0; i<numRows; i++) {
		for (var j=0; j<numCols; j++) {
			var key = i*16 + j;
			if (currentFrame[i][j] || backFrame[i][j]) {
				var elem = findElemByXY(j,i);
				if (midiDrawRoutine)
					midiDrawRoutine(i,j,currentFrame[i][j],elem.classList.contains("mature"));
			}
		}	
	}
}

function tick() {
	var tempFrame = currentFrame;
	var c;

	// swap the frame buffers
	currentFrame = backFrame;
	backFrame = tempFrame;

	// run the algorithm
	for (var i=0; i<numRows; i++) {
		for (var j=0; j<numCols; j++) {
			c = countLiveNeighbors(backFrame,i,j);
			if (backFrame[i][j]) // the cell was alive last frame
				currentFrame[i][j] = ((c==2)||(c==3));
			  else // the cell was dead last frame
			  	currentFrame[i][j] = (c==3);
		}
	}

	//update the cells
	for (var i=0; i<numRows; i++) {
		var rowElem = theUniverse.children[i];
		for (var j=0; j<numCols; j++) {
			var cellElem = rowElem.children[j];
			if (currentFrame[i][j]) {
				cellElem.className = "cell live";
				if (backFrame[i][j])
					cellElem.classList.add("mature");
			} else
			  	cellElem.className = "cell";
		}
	}
//	drawFullBoardToMIDI();
	updateMIDIFromLastFrame();
	updateDottiFromLastFrame();
}

function LaunchpadMIDIProc(event) {
	data = event.data;
	var cmd = data[0] >> 4;
	var channel = data[0] & 0xf;
	var noteNumber = data[1];
	var velocity = data[2];

	if ( cmd==8 || ((cmd==9)&&(velocity==0)) ) { // with MIDI, note on with velocity zero is the same as note off
		// note off
	} else if (cmd == 9) {  // Note on
		if ((noteNumber&0x0f)==8)
			tick();
		else {
			var x = noteNumber & 0x0f;
			var y = (noteNumber & 0xf0) >> 4;
			flipXY( x, y );
		}
	} else if (cmd == 11) {  // CC - top row of buttons
		if (velocity) // if vel==0, it's a button-up
			tick();
	}
}

function LaunchPadProAndMKIIMIDIProc(event) {
	data = event.data;
	var cmd = data[0] >> 4;
//	var channel = data[0] & 0xf;
	var noteNumber = data[1];
	var velocity = data[2];

	if ( cmd==8 || ((cmd==9)&&(velocity==0)) ) { // with MIDI, note on with velocity zero is the same as note off
		// note off - ignore
	} else if (cmd == 9) {  // Note on
		// if it's one of the buttons around the sides, tick.
		if (
			((noteNumber<99) && (noteNumber>90)) || // top row
			((noteNumber<10) && (noteNumber>0)) || // bottom row
			((noteNumber%10) ==0) || // left side
			((noteNumber%10) ==9)) // right side
			tick();
		else {
			var x = (noteNumber % 10) - 1;
			var y = 8-Math.floor( noteNumber / 10 );
			flipXY( x, y );
		}
	} else if (cmd == 11) {  // CC - top/left/bottom/right buttons
		if (velocity) // if vel==0, it's a button-up on the Launchpad Pro.
			tick();
	}
}

function QuneoMIDIProc(event) {
	data = event.data;
	var cmd = data[0] >> 4;
	var channel = data[0] & 0xf;
	var noteNumber = data[1];
	var velocity = data[2];

	if ( cmd==8 || ((cmd==9)&&(velocity==0)) ) { // with MIDI, note on with velocity zero is the same as note off
		// note off
	} else if (cmd == 9) {  // Note on
		if ((channel==2)&&(noteNumber<127)) {
			var x = Math.floor(noteNumber/16);
			var y = (noteNumber % 16)/2;
//	var key = 0 + (7-x)*16 + (y*2);
			flipXY( x, y );
		} else
			tick();
	} else if (cmd == 11) {  // CC - top row of buttons
		if (velocity) // if vel==0, it's a button-up
			tick();
	}
}


