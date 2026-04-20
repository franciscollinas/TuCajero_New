process.env.NODE_OPTIONS = '--disable-warning=DEP0060';
const path = require('path');
require(path.join(__dirname, '..', 'node_modules', '.bin', 'concurrently'));
