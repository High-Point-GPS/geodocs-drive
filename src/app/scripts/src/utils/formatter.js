
export const getGroups = (device, user, groups) => {
	let deviceGroups = [];
	let userGroups = [];
	if (device !== null) {
		deviceGroups = device.groups.map((g) => g.id);
	}

	if (user !== undefined) {
		if (user.driverGroups) {
			userGroups.push(...user.driverGroups.map((g) => g.id));
		}

		if (user.reportGroups) {
			userGroups.push(...user.reportGroups.map((g) => g.id));
		}

		if (user.privateUserGroups) {
			userGroups.push(...user.privateUserGroups.map((g) => g.id));
		}

		if (user.securityGroups) {
			userGroups.push(...user.securityGroups.map((g) => g.id));
		}
	}

	const groupIdsCombined = [...deviceGroups, ...userGroups];

	const result = [];

	groupIdsCombined.forEach((groupId) => {
		const group = groups.find((g) => g.id === groupId);

		if (group) {
			result.push(group.name);
		}
	});

	return result;
};
