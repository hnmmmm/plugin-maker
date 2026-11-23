const { contextBridge, ipcRenderer } = require('electron');
const call = (name) => (...args) => ipcRenderer.invoke(name, ...args);

contextBridge.exposeInMainWorld('api', {
  saveFile: (name, content) => ipcRenderer.invoke('file:save', { name, content }),
  saveBinary: (name, base64) => ipcRenderer.invoke('file:saveBinary', { name, base64 }),
  pickImage: call('file:pickImage'),
  listProjects: call('projects:list'),
  loadProject: call('projects:load'),
  saveProject: call('projects:save'),
  deleteProject: call('projects:delete'),
  exportEnv: call('export:env'),
  defaultDir: call('export:defaultDir'),
  pickFolder: call('export:pickFolder'),
  openFolder: call('export:openFolder'),
  pickServer: call('export:pickServer'),
  exportProject: call('export:run'),
  mcCatalog: call('mc:catalog'),
  saveMcCatalog: call('mc:saveCatalog'),
  onMcLog: (cb) => {
    ipcRenderer.removeAllListeners('mc:log');
    ipcRenderer.on('mc:log', (e, line) => cb(line));
  },
  onExportLog: (cb) => {
    ipcRenderer.removeAllListeners('export:log');
    ipcRenderer.on('export:log', (e, line) => cb(line));
  }
});
