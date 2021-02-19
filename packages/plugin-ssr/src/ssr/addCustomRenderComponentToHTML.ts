import { ILoaderQuery } from '../types';
import addPageHTMLAssign from './addPageHTMLAssign';

export default function addCustomRenderComponentToHTML(
  {
    needInjectStyle,
    entryName,
    pageConfig = { path: '/' },
    publicPath,
    assetsProcessor = '',
    useRunApp,
    doctype = '<!DOCTYPE html>',
    injectedHTML = { scripts: [] },
  }: ILoaderQuery,
) {
  const scripts = [];
  const styles = [];
  if (needInjectStyle) {
    styles.push(`${publicPath}${entryName}.css`);
  }
  scripts.push(`${publicPath}${entryName}.js`);

  return `
  async function renderComponentToHTML(Component, ctx, initialData) {
    const pageInitialProps = await getInitialProps(Component, ctx);
    const data = {
      __SSR_ENABLED__: true,
      initialData,
      pageInitialProps
    };

    // Assign pageHTML
    ${addPageHTMLAssign(useRunApp)}

    const documentData = await getInitialProps(Document, ctx);
    const title = Component.__pageConfig.title;

    let scripts = ${JSON.stringify(scripts)};
    let styles = ${JSON.stringify(styles)};

    ${assetsProcessor}

    const DocumentContextProvider = function() {};
    DocumentContextProvider.prototype.getChildContext = function() {
      return {
        __initialHtml: pageHTML,
        __initialData: JSON.stringify(data),
        __styles: styles,
        __scripts: scripts,
        __pagePath: '${pageConfig.path}'
      };
    };
    DocumentContextProvider.prototype.render = function() {
      return createElement(Document, {
        ...documentData,
        title,
      });
    };

    const html = renderer.renderToString(createElement(DocumentContextProvider));

    const $ = new Generator(html);
    if (title) {
      $.title.innerHTML = Component.__pageConfig.title;
    }

    $.insertScript(${JSON.stringify(injectedHTML.scripts || [])});

    if (html.indexOf('window.__INITIAL_DATA__=') < 0) {
      $.insertScript('<script data-from="server">window.__INITIAL_DATA__=' + JSON.stringify(data) + '</script>')
    }

    return '${doctype || ''}' + $.html();
  };
  `;
}