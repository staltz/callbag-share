import { Source } from 'callbag';

export default function share<T extends Source<any>>(source: T): T;
