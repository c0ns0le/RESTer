'use strict';

const { until } = require('selenium-webdriver');

const { RequestSelectors, SettingsSelectors } = require('./page-elements');

const pages = {
    request: {
        url: '/',
        selector: RequestSelectors.page
    },
    settings: {
        url: '/settings',
        selector: SettingsSelectors.page
    }
};

exports.goTo = function (driver, baseUrl, timeout) {
    let lastPage;

    return async function (page) {
        const { url, selector } = pages[page];

        await driver.get(`${baseUrl}#${url}`);
        await driver.wait(until.elementLocated(selector), timeout);
        if (lastPage) {
            await driver.wait(until.stalenessOf(lastPage), timeout);
        }

        lastPage = await driver.findElement(selector);
    };
};