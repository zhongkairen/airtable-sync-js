enum UpdateStatus {
    UPDATED = "updated",
    UNCHANGED = "unchanged",
    FAILED = "failed"
}

interface Change {
    old: any;
    new: any;
}

interface RecordContext {
    id: string;
    issueNumber?: number;
    changes?: { [field: string]: Change };
    error?: string; // Optional error message for failed records
}

class UpdateResult {
    private result: { [key in UpdateStatus]: RecordContext[] } = {
        [UpdateStatus.UPDATED]: [],
        [UpdateStatus.UNCHANGED]: [],
        [UpdateStatus.FAILED]: []
    };

    toString(): string {
        return this.summary;
    }

    get updated(): RecordContext[] {
        return this.result[UpdateStatus.UPDATED];
    }

    get unchanged(): RecordContext[] {
        return this.result[UpdateStatus.UNCHANGED];
    }

    get failed(): RecordContext[] {
        return this.result[UpdateStatus.FAILED];
    }

    get error(): string | undefined {
        if (this.failed.length > 0) {
            const failedRecords = this.failed
                .map(record => `  ${record.error}`)
                .join("\n");
            return `failed record(s): \n${failedRecords}`;
        }
        return undefined; // Explicit return for clarity
    }

    get summary(): string {
        const result: string[] = [];
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

    get updates(): string {
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

    addRecordStatus(context: RecordContext, status: UpdateStatus): void {
        this.result[status].push(context);
    }
}

export { UpdateResult, UpdateStatus, RecordContext };