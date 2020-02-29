# nward

The **Nward** library facilitates serial communication between [NW.js](https://nwjs.io) and 
Arduino-compatible microcontrollers. It does so without relying on the `serialport` which has to be 
specifically recompiled for NW.js (which might have you pulling your hair out).

## Installation & usage

To install it, simply issue the usual command in the Terminal (macOS, Linux) or Command 
Prompt/PowerShell (Windows): 

```
npm install nward
```
Once installed, you simply need to import it. The library is bundled as an ECMAScript 6 module. To 
import it, use this line at the top of your (module-compatible) script: 

```javascript
import {Nward} from "node_modules/nward/dist/nward.esm.min.js";
```
Note that the library (purposely) does not provide a default export. This means you have to use 
curly quotes when importing.

## API Reference

The complete API reference is available at 
[https://djipco.github.io/nward/](https://djipco.github.io/nward/).
