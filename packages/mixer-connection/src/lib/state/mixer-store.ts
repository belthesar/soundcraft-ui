import { connectable, filter, map, ReplaySubject, scan, share } from 'rxjs';
import { setObjectPath } from '../utils/object-path';

import { transformStringValue } from '../util';
import { MixerConnection } from '../mixer-connection';
import { ChannelStore } from './channel-store';

export class MixerStore {
  /**
   * Internal filtered stream of matched SETD and SETS messages
   */
  private setdSetsMessageMatches$ = this.conn.allMessages$.pipe(
    map(msg => msg.match(/(SETD|SETS)\^([a-zA-Z0-9.]+)\^(.*)/)),
    filter(e => !!e),
    share()
  );

  /**
   * Stream of raw SETD and SETS messages
   */
  readonly messages$ = this.setdSetsMessageMatches$.pipe(map(([msg]) => msg));

  /**
   * The full mixer state. Updates whenever the state changes.
   */
  readonly state$ = connectable(
    this.setdSetsMessageMatches$.pipe(
      map(([, , path, value]) => ({
        path: path.split('.').map(transformStringValue),
        value: transformStringValue(value),
      })),
      scan((acc, { path, value }) => setObjectPath(acc, path, value), {})
    ),
    { connector: () => new ReplaySubject(1) }
  );

  channelStore = new ChannelStore();

  constructor(private conn: MixerConnection) {
    // start producing state values
    this.state$.connect();
  }
}
