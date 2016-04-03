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
  console.log('Set LED color: ' + red + ', ' + green + ', ' + blue);
  let position = (row-1)*8 + column;
  let command = 0x0702;
  let cmd = new Uint8Array([(command >> 8) & 0xff, command & 0xff, position, red, green, blue]);

  sendCommand(cmd).then(() => {
    console.log('LED color set.');
  })
  .catch(handleError);
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
        // Clear panel
        setPanelColor(0, 0, 0);
      })
      .catch(handleError);
    } else {
//      progress.hidden = true;
      setPanelColor(0, 0, 0);
    }
  }
}
