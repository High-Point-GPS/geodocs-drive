// Geotab's root "Company Group" contains every other group, so when it appears in a
// list of group names the rest are redundant for display — show just it.
export const isCompanyGroupLabel = (label) =>
	String(label).trim().toLowerCase() === 'company group';

export const collapseCompanyGroup = (labels) => {
	if (!Array.isArray(labels)) return labels || [];
	const company = labels.find((l) => isCompanyGroupLabel(l));
	return company ? [company] : labels;
};

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
