'use strict';

const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const path = require('path');

const PluginError = require('plugin-error');
const File = require('vinyl');
const parse5 = require('parse5');
const through = require('through2');


module.exports = function () {
    const added = {};

    function importSources(stream, file) {
        if (file.isNull()) {
            return Promise.resolve(file);
        }

        if (file.isStream()) {
            return Promise.reject(new PluginError('import-referenced-sources', 'Streaming not supported'));
        }

        const fragment = parse5.parseFragment(file.contents.toString());

        const importUrls = fragment.childNodes
            .filter(node =>
                node.nodeName === 'link' &&
                node.attrs.some(attr => attr.name === 'rel' && attr.value === 'import'))
            .map(node => node.attrs.find(attr => attr.name === 'href').value);

        const scriptUrls = fragment.childNodes
            .filter(node =>
                node.nodeName === 'script' &&
                node.attrs.some(attr => attr.name === 'src'))
            .map(node => node.attrs.find(attr => attr.name === 'src').value);

        const promises = importUrls.concat(scriptUrls).map(url => {
            const absolutePath = path.join(path.dirname(file.path), url);

            if (added[absolutePath]) {
                return;
            } else {
                added[absolutePath] = true;
            }

            return readFile(absolutePath).then(contents => {
                const newFile = new File({
                    cwd: file.cwd,
                    base: file.base,
                    path: absolutePath,
                    contents: contents
                });

                if (url.endsWith('.html')) {
                    return importSources(stream, newFile).then(() => {
                        stream.push(newFile);
                    });
                } else {
                    stream.push(newFile);
                }
            });
        });

        return Promise.all(promises).then(() => file);
    }

    return through.obj(function (file, enc, cb) {
        importSources(this, file)
            .then(result => cb(null, result))
            .catch(err => cb(err));
    });
};
