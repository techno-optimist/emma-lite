/**
 * HML Hybrid Logical Clock (HLC) per HML §7
 *
 * hlc = (wall_time_ms << 16) | (counter & 0xFFFF)
 * MAX_CLOCK_SKEW = 300 seconds
 */

export class HMLHybridLogicalClock {
  constructor() {
    this.wallTimeMs = 0;
    this.counter = 0;
  }

  /** Tick the local clock */
  tick() {
    const now = Date.now();
    if (now > this.wallTimeMs) {
      this.wallTimeMs = now;
      this.counter = 0;
    } else {
      this.counter = (this.counter + 1) & 0xFFFF;
    }
    return this.format();
  }

  /** Update with a remote HLC string and return new local HLC */
  update(remoteHlc) {
    const remote = HMLHybridLogicalClock.parse(remoteHlc);
    const now = Date.now();

    const localWall = this.wallTimeMs;
    const localCtr = this.counter;
    const remoteWall = remote.wallTimeMs;
    const remoteCtr = remote.counter;

    const maxWall = Math.max(now, Math.max(localWall, remoteWall));

    if (maxWall === now) {
      if (now > localWall && now > remoteWall) {
        // Fresh wall time dominates
        this.wallTimeMs = now;
        this.counter = 0;
      } else if (now === localWall && now > remoteWall) {
        // Local tie with now; increment counter
        this.wallTimeMs = now;
        this.counter = (localCtr + 1) & 0xFFFF;
      } else if (now === remoteWall && now > localWall) {
        // Remote tie with now; increment counter
        this.wallTimeMs = now;
        this.counter = (remoteCtr + 1) & 0xFFFF;
      } else {
        // Both behind now; reset
        this.wallTimeMs = now;
        this.counter = 0;
      }
    } else if (maxWall === localWall) {
      if (localWall > remoteWall) {
        this.counter = (localCtr + 1) & 0xFFFF;
      } else if (localWall === remoteWall) {
        this.counter = (Math.max(localCtr, remoteCtr) + 1) & 0xFFFF;
      }
    } else {
      // Remote wall is greatest
      if (remoteWall > localWall) {
        this.wallTimeMs = remoteWall;
        this.counter = (remoteCtr + 1) & 0xFFFF;
      } else if (remoteWall === localWall) {
        this.wallTimeMs = remoteWall;
        this.counter = (Math.max(localCtr, remoteCtr) + 1) & 0xFFFF;
      }
    }

    return this.format();
  }

  /** Format to HML hex representation */
  format() {
    const hlc = (BigInt(this.wallTimeMs) << 16n) | BigInt(this.counter & 0xFFFF);
    return '0x' + hlc.toString(16).toUpperCase().padStart(16, '0');
  }

  /** Parse HML HLC string */
  static parse(hlcStr) {
    if (!/^0x[0-9A-Fa-f]+$/.test(hlcStr)) {
      throw new Error('Invalid HLC format');
    }
    const val = BigInt(hlcStr);
    const wallTimeMs = Number(val >> 16n);
    const counter = Number(val & 0xFFFFn);
    return { wallTimeMs, counter };
  }
}

export const HML_MAX_CLOCK_SKEW_SECONDS = 300;







