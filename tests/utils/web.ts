/**
 * The network in a test: host names that resolve to given addresses, and pages at given URLs.
 *
 * fakeWeb: a Web that answers from the tables, and the requests it got, so a test sees which
 * address a request went to, or that none went out.
 * Page: one answer of a server.
 *
 * @example const { web, requests } = fakeWeb({ 'jobs.example': ['93.184.216.34'] }, pages);
 */
import type { Web } from '../../read/web.ts';

export type Page = {
  status: number;
  body?: string | Buffer | AsyncIterable<Buffer>;
  location?: string;
  encoding?: string;
};

export function fakeWeb(sites: Record<string, string[]>, pages: Record<string, Page>) {
  const requests: { address: string; url: string }[] = [];
  const web: Web = {
    lookup: async host => {
      const addresses = sites[host];
      if (addresses === undefined)
        throw Object.assign(new Error(`getaddrinfo ENOTFOUND ${host}`), {
          code: 'ENOTFOUND',
          syscall: 'getaddrinfo',
        });
      return addresses;
    },
    get: async ({ address, url }) => {
      requests.push({ address, url: url.href });
      const page = pages[url.href] ?? { status: 404 };
      return {
        status: page.status,
        location: page.location,
        encoding: page.encoding,
        body: bodyOf(page.body),
      };
    },
  };
  return { web, requests };
}

async function* bodyOf(body: Page['body']) {
  if (body === undefined) return;
  if (typeof body === 'string' || Buffer.isBuffer(body)) {
    yield Buffer.from(body);
    return;
  }
  yield* body;
}
