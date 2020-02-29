const str2ab = require("string-to-arraybuffer");

import {EventEmitter} from "../node_modules/djipevents/dist/djipevents.esm.min.js";
import isArrayBuffer from "../node_modules/is-array-buffer/dist/is-array-buffer.esm.js";

/**
 * The `Nward` class provides methods to communicate via serial to an Arduino-compatible device. It
 * extends the [EventEmitter](https://djipco.github.io/djipevents/EventEmitter.html) class from
 * [djipevents](https://github.com/djipco/djipevents).
 */
export class Nward extends EventEmitter{

  constructor() {

    super();

    /**
     * @private
     */
    this.buffer = "";

    /**
     * @private
     */
    this.listeners = {};

    /**
     * @private
     */
    this.connectionId = null;

    /**
     * The serial port currently in use (e.g. `COM3`, `/dev/cu.usbmodem2101`, etc.). When no
     * connection is active, this is set to `null`.
     *
     * @type {?string}
     * @readonly
     */
    this.port = null;

  }

  /**
   * The `ConnectionInfo` object provides details about a serial connexion. You can view all details
   * about the
   * [ConnectionInfo]{@linkcode https://developer.chrome.com/apps/serial#type-ConnectionInfo} object
   * of the Chrome App Serial documentation.
   *
   * @typedef {Object} Nward~ConnectionInfo
   * @property {integer} connectionId
   * @property {boolean} paused
   * @property {boolean} persistent
   * @property {string} name
   * @property {integer} bufferSize
   * @property {integer} receiveTimeout
   * @property {integer} sendTimeout
   * @property {integer} [bitrate]
   * @property {DataBits} [dataBits]
   * @property {ParityBits} [parityBit]
   * @property {StopBits} [StopBits]
   * @property {boolean} [ctsFlowControl]
   */

  /**
   * Tries to open a serial connection to the Arduino-compatible device hooked up to the port
   * specified in the `options` parameter. If no port is specified, it tries to connect to the last
   * port in the list obtained by calling {@link Nward.getDevices}.
   *
   * This is an asynchronous operation. When it succeeds, it returns a promise fulfilled with a
   * {@link Nward~ConnectionInfo} object providing information about the established connection.
   *
   * @param {Object} [options={}]
   * @param {string} [options.port] The port to connect to (`"COM3"`, `"/dev/cu.usbmodem2101"`,
   * etc.)
   * @param {string} [options.bitrate=57600] The requested bitrate of the connection to be opened.
   * For compatibility with the widest range of hardware, this number should match one of
   * commonly-available bitrates such as:
   *
   *  * 110
   *  * 300
   *  * 1200
   *  * 2400
   *  * 4800
   *  * 9600
   *  * 14400
   *  * 19200
   *  * 38400
   *  * 57600 (default)
   *  * 115200
   *
   * @returns {Promise<ConnectionInfo>} The promise is fulfilled with a
   * {@link Nward~ConnectionInfo} object providing details about the connection.
   */
  async open(options = {}) {

    if (options.port) {
      this.port = options.port;
      delete options.port;
    } else {
      let devices = await Nward.getDevices();
      this.port = devices[devices.length - 1].path;
    }

    let defaults = {
      bitrate: 57600,
    };

    options = Object.assign(defaults, options);

    return new Promise(resolve => {

      chrome.serial.connect(this.port, options, info => {
        this.connectionId = info.connectionId;
        this.listeners.onDataReceived = this.onDataReceived.bind(this);
        chrome.serial.onReceive.addListener(this.listeners.onDataReceived);
        this.listeners.onError = this.onError.bind(this);
        chrome.serial.onReceiveError.addListener(this.listeners.onError);
        info.port = this.port;
        resolve(info);
      });

    });

  }

  /**
   * Device
   *
   * @typedef {Object} Nward~Device
   * @property {string} path
   * @property {string} vendorId
   * @property {string} productId
   * @property {string} displayName
   */

  /**
   * Returns a list of sserial devices likely to be Arduino-compatible. This list will always
   * include all Arduino-compatible devices but, depending on the platform, may also nclude other
   * serial devices as well. If the `all` parameter is set to true, it will systematically return
   * all serial devices.
   *
   * @param {boolean} [all=false] Whether to return all serial devices or only Arduino-compatible
   * devices.
   * @returns {Promise<array>} An array of Nward~Device objects describing the devices
   * found.
   */
  static async getDevices(all = false) {

    return new Promise(resolve => {

      chrome.serial.getDevices(devices => {

        let found = devices;

        if (!all) found = devices.filter(device => /usb|acm|^com/i.test(device.path));
        resolve(found);

      });

    });

  }

  /**
   * Returns a promise fulfilled with an array of currently opened serial port connections owned by
   * the application.
   *
   * @returns {Promise<array>}
   */
  static async getSerialConnections() {
    return new Promise(resolve => chrome.serial.getConnections(resolve));
  }

  /**
   *
   * @returns {Promise<unknown>}
   */
  async getConnectionInfo() {

    if (!this.connectionId) return null;

    return new Promise(resolve => {
      chrome.serial.getInfo(this.connectionId, info => resolve(info));
    });

  }

  /**
   * Sends the specified data to the Arduino. The data can be a `string` or an `ArrayBuffer`. If
   * it's a string, a newline will be appended at the end.
   *
   * @param {string|ArrayBuffer} data The data to send to the Arduino
   * @returns {Promise<unknown>}
   */
  async send(data) {

    let ab;

    if (isArrayBuffer(data)) {
      ab = data;
    } else {
      ab = str2ab(data + "\n");
    }

    return new Promise(resolve => {
      chrome.serial.send(this.connectionId, ab, info => resolve(info));
    });

  }

  async sendInstruction(command, value) {

    if (!command) return Promise.reject("You must provide a command.");

    let instruction = command;
    if (value) instruction += "=" + parseInt(value);
    instruction += "\n";

    return this.send(instruction);

  }

  onDataReceived(info) {

    let lines = Nward.ab2str(info.data).split("\n");
    lines[0] = this.buffer + lines[0];
    this.buffer = lines.pop();

    lines.forEach(line => {
      const [type, value] = line.split("=");
      this.emit(type, value);
    });

  }

  onError(info) {
    this.emit("error", {connectionId: info.connectionId, code: info.error});
    this.close();
  }

  async close() {

    return new Promise(resolve => {

      chrome.serial.onReceive.removeListener(this.listeners.onDataReceived);
      this.listeners.onDataReceived = undefined;
      chrome.serial.onReceiveError.removeListener(this.listeners.onError);
      this.listeners.onError = undefined;
      this.port = null;

      chrome.serial.disconnect(this.connectionId, resolve);
      this.connectionId = null;

    });

  }

  static ab2str(buffer, encoding) {
    if (encoding == null) encoding = "utf8";
    return Buffer.from(buffer).toString(encoding);
  }

}
