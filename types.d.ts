import { Source } from 'callbag';

export default function share<T>(source: Source<T>): Source<T>;
