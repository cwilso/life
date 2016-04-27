window.addEventListener('load', function() {
        /**
         * Check if browser supports Web Bluetooth API.
         */
        if (navigator.bluetooth == undefined) {
          console.log("no bluetooth support found");
//          document.getElementById("no-bluetooth").open();
        } else
          document.getElementById("dotti").style.visibility = "visible";
} );

let gattServer;
let commandService;
let writeCharacteristic;
let busy = false;


/**
 * Send a command to the device.
 * See http://wittidesign.com/en/developer/ for API.
 *
 * @param cmd The command bytes and associated data.
 */
function sendCommand(cmd) {
  if (writeCharacteristic) {
    // Handle one command at a time
    if (busy) {
      // Return if another operation pending
      return Promise.resolve();
    }
    busy = true;

    return writeCharacteristic.writeValue(cmd).then(() => {
      busy = false;
    });
  } else {
    return Promise.resolve();
  }
}

/**
 * Set color of the panel.
 */
function setPanelColor(red, green, blue) {
  console.log('Set panel color');
  let command = 0x0601;
  let cmd = new Uint8Array([(command >> 8) & 0xff, command & 0xff, red, green, blue]);

  sendCommand(cmd).then(() => {
    console.log('panel color set.');
  })
  .catch(handleError);
}

/**
 * Set color of an LED.
 */
function setLedColor(row, column, red, green, blue) {
  console.log('Set LED color:  ('+row+','+column+') ' + red + ', ' + green + ', ' + blue);
  let position = (row-1)*8 + column;
  let command = 0x0702;
  let cmd = new Uint8Array([(command >> 8) & 0xff, command & 0xff, position, red, green, blue]);

  sendCommand(cmd).then(() => {
    console.log('LED color set.');
  })
  .catch(handleError);
}

function clearDottiPanel() {
	setPanelColor(10,10,10);
}
/**
 * Reset the app variable states.
 */
function resetVariables() {
  busy = false;
//  progress.hidden = true;
  gattServer = null;
  commandService = null;
  writeCharacteristic = null;
}

/**
 * API error handler.
 */
function handleError(error) {
  console.log(error);
  resetVariables();
//  dialog.open();
}

// 1c:1a:c0:73:ad:a4

/**
 * Connect to command characteristic.
 */
function connectBT() {
  if (gattServer != null && gattServer.connected) {
    ///disconnect();
  } else {
    console.log('Connecting...');
//    progress.hidden = false;
    if (writeCharacteristic == null) {
      navigator.bluetooth.requestDevice({
        filters: [{
          namePrefix: 'Dotti',
        }],
        optionalServices: ['0000fff0-0000-1000-8000-00805f9b34fb']
      })
      .then(device => {
        console.log('Connecting to GATT Server...');
        return device.connectGATT();
      })
      .then(server => {
        console.log('> Found GATT server');
        gattServer = server;
        // Get command service
        return gattServer.getPrimaryService('0000fff0-0000-1000-8000-00805f9b34fb');
      })
      .then(service => {
        console.log('> Found command service');
        commandService = service;
        // Get write characteristic
        return commandService.getCharacteristic('0000fff3-0000-1000-8000-00805f9b34fb');
      })
      .then(characteristic => {
        console.log('> Found write characteristic');
        writeCharacteristic = characteristic;
//        progress.hidden = true;
        drawFullBoardToDotti();
      })
      .catch(handleError);
    } else {
//      progress.hidden = true;
      clearDottiPanel();
    }
  }
}

function setDottiPixel(row,column,red,green,blue) {
	if (gattServer && gattServer.connected)
		setLedColor(row+1,column+1,red,green,blue);
}

var currRow=0, currCol=0;

function drawNextPixel() {
	var elem = findElemByXY(currCol,currRow);
	var red = elem.classList.contains("mature")?255:0;
	var green = elem.classList.contains("live")?255:0;
    console.log('Drawing pixel:  ('+currRow+','+currCol+') (' + red + ',' + green + ',' + 0+')');
  	let cmd = new Uint8Array([ 0x07, 0x02, 8*currRow + currCol + 1, red, green, 0]);
  	currCol++;
  	if (currCol==numCols) {
  		currCol=0;
  		currRow++;
  	}

	sendCommand(cmd).then(() => {
    console.log('Drew pixel.');
    if (currRow==numRows) {
    	console.log('Done drawing board.')
    	currRow=0;
    } else
    	drawNextPixel();
	}).catch(handleError);
}


function drawFullBoardToDotti() {
	if (!gattServer || !gattServer.connected) 
		return;

	let command = 0x0601;
	let cmd = new Uint8Array([(command >> 8) & 0xff, command & 0xff, 10, 10, 10]);

	sendCommand(cmd).then(() => {
		console.log('Cleared board.');
		currRow=0;
		currCol=0;
		drawNextPixel();
	})
	.catch(handleError);
}

function updateNextPixel() {
	while (!(currentFrame[currCol][currCol] || backFrame[currCol][currCol])) {
	  	currCol++;
	  	if (currCol==numCols) {
	  		currCol=0;
	  		currRow++;
	  	}
	  	if (currRow==numRows)
	  		return;  // we're done
	}
	var elem = findElemByXY(currCol,currRow);
	var red = elem.classList.contains("mature")?255:0;
	var green = elem.classList.contains("live")?255:0;
    console.log('Drawing pixel:  ('+currRow+','+currCol+') (' + red + ',' + green + ',' + 0+')');
  	let cmd = new Uint8Array([ 0x07, 0x02, 8*currRow + currCol + 1, red, green, 0]);
  	currCol++;
  	if (currCol==numCols) {
  		currCol=0;
  		currRow++;
  	}
	sendCommand(cmd).then(() => {
    console.log('Drew pixel.');
    if (currRow==numRows) {
    	console.log('Done drawing board.')
    	currRow=0;
    } else
    	updateNextPixel();
	}).catch(handleError);
}


function updateDottiFromLastFrame() {
	currRow=0;
	currCol=0;
	updateNextPixel();
}


