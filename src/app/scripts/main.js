import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './src/App';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { getGroups } from './src/utils/formatter';

const sessionInfo = {};
const addinId = 'amNmY2Q2ZDEtMmZjMy1hOWJ';


const elements = {
    eulaModalBackdrop: document.getElementById('eula-modal-backdrop'),
    eulaModal: document.getElementById('eula-modal'),
    eulaMessageDiv: document.getElementById('eula-message'),
    acceptButton: document.getElementById('eula-accept-button'),
    declineButton: document.getElementById('eula-decline-button'),
    //mainUiDiv: document.getElementById('main-ui')
};

const showModal = (shouldShow) => {
	const backdrop = document.getElementById('eula-modal-backdrop');

	if (backdrop) {
		backdrop.style.display = shouldShow ? 'flex' : 'none';
	}
	
    return shouldShow;
};

const handleButtonClick = async (buttonValue, api) => {
    showModal(false);

    if (buttonValue === 'Decline') {
        redirectToDashboard();
    } else if (buttonValue === 'Accept') {
        try {
            // Replace with your actual Firebase endpoint URL
            const endpoint = 'https://us-central1-geotabfiles.cloudfunctions.net/addEulaUser';

            // Get session info if not already available
            const session = sessionInfo.sessionId || (await new Promise(resolve => {
                api.getSession((sess) => resolve(sess.sessionId));
            }));
            const database = sessionInfo.database;
            const username = sessionInfo.userName;

            if (!session || !database || !username) {
                throw new Error('Missing session, database, or username');
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session: sessionInfo,
                    database,
                    username
                })
            });

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }

            location.reload(true);

        } catch (error) {
            console.error('Error in handleButtonClick:', error);
        }
    }
};

const redirectToDashboard = () => {
    if (sessionInfo.server && sessionInfo.database) {
        window.location.href = `https://${sessionInfo.server}/${sessionInfo.database}/#dashboard`;
    } else {
        console.error('Error: sessionInfo.server or sessionInfo.database is undefined.');
    }
};

const isEulaAccepted = async (userName, api) => {
    const endpoint = 'https://us-central1-geotabfiles.cloudfunctions.net/checkEula';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session: sessionInfo,
                database: sessionInfo.database,
                username: userName
            })
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();
        return !!data.eulaAccepted;
    } catch (error) {
        console.error('Failed to check EULA acceptance:', error);
        return false;
    }
};

/**
 * @returns {{initialize: Function, focus: Function, blur: Function, startup; Function, shutdown: Function}}
 */
geotab.addin.hpgpsFilemanagerDrive = function () {
	'use strict';

	// the root container
	var elAddin = document.getElementById('scroll-content');

	var appEl = document.getElementById('app');

	return {
		/**
		 * Startup Add-Ins are executed when a driver logs in to the Drive App for the first time.
		 * When the dashboard page is visible, the startup method is only called once.
		 * If the user navigates away from the page then navigates back, the startup method is not called again.
		 * If the Add-In requires re-initialization, the user must either log out and log in again, or refresh the application.
		 * @param {object} freshApi - The GeotabApi object for making calls to MyGeotab.
		 * @param {object} freshState - The page state object allows access to URL, page navigation and global group filter.
		 * @param {function} initializeCallback - Call this when your initialize route is complete. Since your initialize routine
		 *        might be doing asynchronous operations, you must call this method when the Add-In is ready
		 *        for display to the user.
		 */
		startup: function (freshApi, freshState, initializeCallback) {
			// MUST call initializeCallback when done any setup
			initializeCallback();
		},

		/**
		 * initialize() is called only once when the Add-In is first loaded. Use this function to initialize the
		 * Add-In's state such as default values or make API requests (MyGeotab or external) to ensure interface
		 * is ready for the user.
		 * @param {object} freshApi - The GeotabApi object for making calls to MyGeotab.
		 * @param {object} freshState - The page state object allows access to URL, page navigation and global group filter.
		 * @param {function} initializeCallback - Call this when your initialize route is complete. Since your initialize routine
		 *        might be doing asynchronous operations, you must call this method when the Add-In is ready
		 *        for display to the user.
		 */
		initialize: function (freshApi, freshState, initializeCallback) {
			// Loading translations if available
			if (freshState.translate) {
				freshState.translate(elAddin || '');
			}

			 freshApi.getSession(async (session, server) => {
                    Object.assign(sessionInfo, {
                    database: session.database,
                    userName: session.userName,
                    sessionId: session.sessionId,
                    server: server
                });

                const eulaAcceptanceStatus = await isEulaAccepted(session.userName, addinId, freshApi);

                if (!eulaAcceptanceStatus) {
                    showModal(true);
                } else {
                    showModal(false);
                }


            });

            elements.acceptButton.addEventListener('click', () => handleButtonClick('Accept', freshApi));
            elements.declineButton.addEventListener('click', () => handleButtonClick('Decline', freshApi));
			// MUST call initializeCallback when done any setup
			initializeCallback();
		},

		/**
		 * focus() is called whenever the Add-In receives focus.
		 *
		 * The first time the user clicks on the Add-In menu, initialize() will be called and when completed, focus().
		 * focus() will be called again when the Add-In is revisited. Note that focus() will also be called whenever
		 * the global state of the MyGeotab application changes, for example, if the user changes the global group
		 * filter in the UI.
		 *
		 * @param {object} freshApi - The GeotabApi object for making calls to MyGeotab.
		 * @param {object} freshState - The page state object allows access to URL, page navigation and global group filter.
		 */
		focus: function (freshApi, freshState) {
			// getting the current user to display in the UI
			freshApi.getSession(async (session, server) => {
				let calls = [];
				if (freshState.device.id === 'NoDeviceId') {
					calls = [
						[
							'Get',
							{
								typeName: 'User',
								search: {
									name: session.userName,
								},
							},
						],
						[
							'Get',
							{
								typeName: 'Group',
							},
						],
					];
				} else {
					calls = [
						[
							'Get',
							{
								typeName: 'Device',
								search: {
									id: freshState.device.id,
								},
							},
						],
						[
							'Get',
							{
								typeName: 'User',
								search: {
									name: session.userName,
								},
							},
						],
						[
							'Get',
							{
								typeName: 'TrailerAttachment',
								search: {
									deviceSearch: {
										id: freshState.device.id,
									},
								},
							},
						],
						[
							'Get',
							{
								typeName: 'Group',
							},
						],
					];
				}

				freshApi.multiCall(
					calls,
					function (result) {
						let device = null;
						let user = null;
						let trailer = [];
						let groups = [];

						if (freshState.device.id === 'NoDeviceId') {
							device = null;
							user = result[0][0] ? result[0][0] : null;
							trailer = [];
							groups = result[1];
						} else {
							device = result[0][0] ? result[0][0] : null;
							user = result[1][0] ? result[1][0] : null;
							trailer = result[2];
							groups = result[3];
						}

						const trailerIds = trailer.map((t) => t.trailer.id);

						freshApi.multiCall(
							trailerIds.map((trailerId) => [
								'Get',
								{
									typeName: 'Trailer',
									search: {
										id: trailerId,
									},
								},
								,
							]),
							async function (result) {
								let newTrailers = [];

								if (result.length > 0) {
									newTrailers = result.map((r) => r[0].name);
								}
								// show main content
								appEl.className = appEl.className.replace('hidden', '').trim();

								const container = document.getElementById('scroll-content');

								const eulaAcceptanceStatus = await isEulaAccepted(session.userName, addinId, freshApi);
								//const eulaAcceptanceStatus = true;

								if (container && eulaAcceptanceStatus) {
									const root = createRoot(container);
									root.render(
										<App
											api={freshApi}
											session={session}
											server={server}
											database={session.database}
											groups={getGroups(device, user, groups)}
											device={
												device !== null
													? `${device.name} (${device.serialNumber})`
													: 'none'
											}
											driver={
												user !== null
													? `${user.firstName} ${user.lastName}`
													: ''
											}
											trailer={newTrailers}
										/>
									);
								}
							}
						);
					},
					function (error) {
						console.log(error);
					}
				);
			});
		},

		/**
		 * blur() is called whenever the user navigates away from the Add-In.
		 *
		 * Use this function to save the page state or commit changes to a data store or release memory.
		 *
		 * @param {object} freshApi - The GeotabApi object for making calls to MyGeotab.
		 * @param {object} freshState - The page state object allows access to URL, page navigation and global group filter.
		 */
		blur: function () {
			// hide main content
			elAddin.innerHTML = '';
		},
		/**
		 * Shutdown Add-Ins are executed when the final driver logs out of the Drive App.
		 * If there are co-drivers, and one of the co-drivers logs out (while other drivers remain logged in to the Drive App),
		 * the shutdown Add-In is not executed.
		 * Additionally, the Add-In is expected to return a promise since shutdown Add-Ins have a 15-second time limit
		 * to perform their function before the Add-Ins time out and the logout process is completed.
		 * The time limit prevents the application from freezing in the middle of the logout process as a result of faulty Add-Ins.
		 * @param {object} api - The GeotabApi object for making calls to MyGeotab.
		 * @param {object} state - The page state object allows access to URL, page navigation and global group filter.
		 * @param {function} resolve - call this somewhere so the promise resolves
		 */
		shutdown: function (api, state, callback) {
			return new Promise((resolve) => {
				// Do work, make any api calls etc

				resolve(); // eventually need to call this somewhere so the promise resolves
			});
		},
	};
};
