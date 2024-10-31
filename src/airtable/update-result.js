const UpdateStatus = {
    UPDATED: "updated",
    UNCHANGED: "unchanged",
    FAILED: "failed"
};

class UpdateResult {
    constructor() {
        this.result = {
            [UpdateStatus.UPDATED]: [],
            [UpdateStatus.UNCHANGED]: [],
            [UpdateStatus.FAILED]: []
        };
    }

    toString() {
        return this.summary;
    }

    get updated() {
        return this.result[UpdateStatus.UPDATED];
    }

    get unchanged() {
        return this.result[UpdateStatus.UNCHANGED];
    }

    get failed() {
        return this.result[UpdateStatus.FAILED];
    }

    get error() {
        if (this.failed.length > 0) {
            const failedRecords = this.failed
                .map(record => `  ${record.error}`)
                .join("\n");
            return `failed record(s): \n${failedRecords}`;
        }
        return undefined; // Explicit return for clarity
    }

    get summary() {
        const result = [];
        if (this.updated.length > 0) {
            result.push(`updated: ${this.updated.length}`);
        }
        if (this.unchanged.length > 0) {
            result.push(`unchanged: ${this.unchanged.length}`);
        }
        if (this.failed.length > 0) {
            result.push(`failed: ${this.failed.length}`);
        }
        return result.join(", ");
    }

    get updates() {
        return this.updated
            .map(update => {
                const changes = update.changes || {};
                const changeList = Object.entries(changes)
                    .map(([field, change]) =>
                        `    ${field}: ${change.old} -> ${change.new}`
                    )
                    .join("\n");
                return `  Record - id:${update.id} issueNumber:${update.issueNumber} \n${changeList}`;
            })
            .join("\n");
    }

    addRecordStatus(context, status) {
        this.result[status].push(context);
    }
}

module.exports = { UpdateResult, UpdateStatus };
