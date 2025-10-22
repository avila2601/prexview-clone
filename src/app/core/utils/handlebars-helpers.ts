import Handlebars from 'handlebars';

/**
 * Handlebars Helpers Registry
 * Centraliza todos los helpers personalizados para templates
 */
export class HandlebarsHelpers {

  /**
   * Registra todos los helpers disponibles
   */
  static registerAllHelpers(): void {
    this.registerBasicHelpers();
    this.registerDateHelpers();
    this.registerMathHelpers();
    this.registerIconHelpers();
    this.registerFormattingHelpers();
    this.registerConditionalHelpers();
    this.registerLoopHelpers();
    this.registerStringHelpers();
  }

  // ========== BASIC HELPERS ==========
  private static registerBasicHelpers(): void {
    Handlebars.registerHelper('ifEquals', function(this: any, arg1: any, arg2: any, options: any) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('ifNotEquals', function(this: any, arg1: any, arg2: any, options: any) {
      return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('default', function(value: any, defaultValue: any) {
      return value || defaultValue;
    });

    Handlebars.registerHelper('json', function(context: any) {
      return JSON.stringify(context, null, 2);
    });

    Handlebars.registerHelper('debug', function(context: any) {
      console.log('Handlebars Debug:', context);
      return '';
    });
  }

  // ========== DATE HELPERS ==========
  private static registerDateHelpers(): void {
    Handlebars.registerHelper('$date', function(dateValue: any, format?: string) {
      if (!dateValue) return '';

      const date = new Date(dateValue);

      if (isNaN(date.getTime())) {
        return dateValue; // Return original if not a valid date
      }

      switch (format) {
        case 'short':
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
        case 'long':
          return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        case 'iso':
          return date.toISOString().split('T')[0];
        case 'time':
          return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          });
        case 'datetime':
          return date.toLocaleString('en-US');
        default:
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
      }
    });

    Handlebars.registerHelper('formatDate', function(date: any, format: string) {
      return Handlebars.helpers['$date'](date, format);
    });

    Handlebars.registerHelper('now', function(format?: string) {
      return Handlebars.helpers['$date'](new Date(), format);
    });

    Handlebars.registerHelper('dateAdd', function(date: any, days: number, format?: string) {
      if (!date) return '';
      const d = new Date(date);
      d.setDate(d.getDate() + Number(days));
      return Handlebars.helpers['$date'](d, format);
    });
  }

  // ========== MATH HELPERS ==========
  private static registerMathHelpers(): void {
    Handlebars.registerHelper('add', function(a: number, b: number) {
      return (Number(a) || 0) + (Number(b) || 0);
    });

    Handlebars.registerHelper('subtract', function(a: number, b: number) {
      return (Number(a) || 0) - (Number(b) || 0);
    });

    Handlebars.registerHelper('multiply', function(a: number, b: number) {
      return (Number(a) || 0) * (Number(b) || 0);
    });

    Handlebars.registerHelper('divide', function(a: number, b: number) {
      return Number(b) !== 0 ? (Number(a) || 0) / Number(b) : 0;
    });

    Handlebars.registerHelper('modulo', function(a: number, b: number) {
      return Number(b) !== 0 ? (Number(a) || 0) % Number(b) : 0;
    });

    Handlebars.registerHelper('percentage', function(value: number, total: number, decimals: number = 1) {
      if (!total || total === 0) return '0%';
      const percent = ((Number(value) || 0) / Number(total)) * 100;
      return percent.toFixed(decimals) + '%';
    });

    Handlebars.registerHelper('round', function(value: number, decimals: number = 2) {
      return Number(Number(value).toFixed(decimals));
    });

    Handlebars.registerHelper('ceil', function(value: number) {
      return Math.ceil(Number(value) || 0);
    });

    Handlebars.registerHelper('floor', function(value: number) {
      return Math.floor(Number(value) || 0);
    });

    Handlebars.registerHelper('abs', function(value: number) {
      return Math.abs(Number(value) || 0);
    });

    Handlebars.registerHelper('max', function(...args: any[]) {
      const numbers = args.slice(0, -1).map(n => Number(n) || 0);
      return Math.max(...numbers);
    });

    Handlebars.registerHelper('min', function(...args: any[]) {
      const numbers = args.slice(0, -1).map(n => Number(n) || 0);
      return Math.min(...numbers);
    });
  }

  // ========== ICON HELPERS ==========
  private static registerIconHelpers(): void {
    Handlebars.registerHelper('$icon', function(iconName: string, options: any) {
      const params = options.hash || {};
      const width = params.width || 24;
      const height = params.height || 24;
      const color = params.color || '#000';
      const library = params.library || 'material-design';
      const fit = params.fit || false;

      if (library === 'material-design') {
        return new Handlebars.SafeString(`
          <span class="material-icons" style="
            font-size: ${width}px;
            color: ${color};
            width: ${fit ? width + 'px' : 'auto'};
            height: ${fit ? height + 'px' : 'auto'};
            display: inline-flex;
            align-items: center;
            justify-content: center;
          ">
            ${iconName}
          </span>
        `);
      }

      if (library === 'emoji') {
        return new Handlebars.SafeString(`
          <span style="font-size: ${width}px; line-height: 1;">
            ${iconName}
          </span>
        `);
      }

      // Fallback placeholder icon
      return new Handlebars.SafeString(`
        <div class="icon-placeholder" style="
          width: ${width}px;
          height: ${height}px;
          background: ${color};
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: ${Math.round(width * 0.4)}px;
          font-weight: bold;
        ">
          ${iconName.substring(0, 2).toUpperCase()}
        </div>
      `);
    });

    Handlebars.registerHelper('svgIcon', function(iconPath: string, options: any) {
      const params = options.hash || {};
      const width = params.width || 24;
      const height = params.height || 24;
      const color = params.color || 'currentColor';
      const viewBox = params.viewBox || '0 0 24 24';

      return new Handlebars.SafeString(`
        <svg width="${width}" height="${height}" fill="${color}" viewBox="${viewBox}">
          <path d="${iconPath}"/>
        </svg>
      `);
    });

    Handlebars.registerHelper('image', function(src: string, options: any) {
      const params = options.hash || {};
      const width = params.width ? `width="${params.width}"` : '';
      const height = params.height ? `height="${params.height}"` : '';
      const alt = params.alt || '';
      const className = params.class || '';

      return new Handlebars.SafeString(`
        <img src="${src}" alt="${alt}" ${width} ${height} class="${className}" />
      `);
    });
  }

  // ========== FORMATTING HELPERS ==========
  private static registerFormattingHelpers(): void {
    Handlebars.registerHelper('currency', function(amount: number, currency: string = 'USD', locale: string = 'en-US') {
      if (amount === null || amount === undefined) return '';

      try {
        const formatter = new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: currency.toUpperCase()
        });
        return formatter.format(Number(amount));
      } catch (error) {
        // Fallback formatting
        const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
        return `${symbol}${Number(amount).toFixed(2)}`;
      }
    });

    // Alias for $currency helper (common usage pattern)
    Handlebars.registerHelper('$currency', function(amount: number, currency: string = 'USD', locale: string = 'en-US') {
      if (amount === null || amount === undefined) return '';

      // Format with comma separators and 2 decimals, no currency symbol for $currency
      const num = Number(amount);
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    });

    Handlebars.registerHelper('number', function(value: number, decimals: number = 0, locale: string = 'en-US') {
      if (value === null || value === undefined) return '';

      try {
        return new Intl.NumberFormat(locale, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(Number(value));
      } catch (error) {
        return Number(value).toFixed(decimals);
      }
    });

    Handlebars.registerHelper('bytes', function(bytes: number, decimals: number = 2) {
      if (bytes === 0) return '0 Bytes';

      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));

      return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
    });

    Handlebars.registerHelper('ordinal', function(number: number) {
      const n = Number(number);
      const suffix = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
    });
  }

  // ========== STRING HELPERS ==========
  private static registerStringHelpers(): void {
    Handlebars.registerHelper('capitalize', function(str: string) {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    });

    Handlebars.registerHelper('uppercase', function(str: string) {
      return str ? str.toUpperCase() : '';
    });

    Handlebars.registerHelper('lowercase', function(str: string) {
      return str ? str.toLowerCase() : '';
    });

    Handlebars.registerHelper('titleCase', function(str: string) {
      if (!str) return '';
      return str.replace(/\w\S*/g, (txt) =>
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
    });

    Handlebars.registerHelper('truncate', function(str: string, length: number = 50, suffix: string = '...') {
      if (!str) return '';
      return str.length > length ? str.substring(0, length) + suffix : str;
    });

    Handlebars.registerHelper('slugify', function(str: string) {
      if (!str) return '';
      return str
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    });

    Handlebars.registerHelper('stripTags', function(str: string) {
      if (!str) return '';
      return str.replace(/<[^>]*>/g, '');
    });

    Handlebars.registerHelper('replace', function(str: string, search: string, replacement: string) {
      if (!str) return '';
      return str.replace(new RegExp(search, 'g'), replacement);
    });

    Handlebars.registerHelper('split', function(str: string, separator: string, index?: number) {
      if (!str) return '';
      const parts = str.split(separator);
      return index !== undefined ? parts[index] || '' : parts;
    });

    Handlebars.registerHelper('join', function(array: any[], separator: string = ', ') {
      if (!Array.isArray(array)) return '';
      return array.join(separator);
    });
  }

  // ========== CONDITIONAL HELPERS ==========
  private static registerConditionalHelpers(): void {
    Handlebars.registerHelper('gt', function(a: any, b: any) {
      return Number(a) > Number(b);
    });

    Handlebars.registerHelper('gte', function(a: any, b: any) {
      return Number(a) >= Number(b);
    });

    Handlebars.registerHelper('lt', function(a: any, b: any) {
      return Number(a) < Number(b);
    });

    Handlebars.registerHelper('lte', function(a: any, b: any) {
      return Number(a) <= Number(b);
    });

    Handlebars.registerHelper('eq', function(a: any, b: any) {
      return a === b;
    });

    Handlebars.registerHelper('ne', function(a: any, b: any) {
      return a !== b;
    });

    Handlebars.registerHelper('or', function(this: any, ...args: any[]) {
      const options = args.pop();
      return args.some(arg => !!arg) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('and', function(this: any, ...args: any[]) {
      const options = args.pop();
      return args.every(arg => !!arg) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('not', function(this: any, value: any, options: any) {
      return !value ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('isEmpty', function(this: any, value: any, options: any) {
      const empty = !value ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' && Object.keys(value).length === 0) ||
        (typeof value === 'string' && value.trim() === '');

      return empty ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('isNotEmpty', function(value: any, options: any) {
      return Handlebars.helpers['isEmpty'](value, {
        fn: options.inverse,
        inverse: options.fn
      });
    });
  }

  // ========== LOOP HELPERS ==========
  private static registerLoopHelpers(): void {
    Handlebars.registerHelper('eachWithIndex', function(this: any, array: any[], options: any) {
      if (!Array.isArray(array)) return options.inverse(this);

      let result = '';
      for (let i = 0; i < array.length; i++) {
        const item = typeof array[i] === 'object' ? array[i] : { value: array[i] };
        result += options.fn({
          ...item,
          '@index': i,
          '@number': i + 1,
          '@first': i === 0,
          '@last': i === array.length - 1,
          '@odd': i % 2 === 1,
          '@even': i % 2 === 0
        });
      }
      return result;
    });

    Handlebars.registerHelper('times', function(n: number, options: any) {
      let result = '';
      const count = Number(n) || 0;

      for (let i = 0; i < count; i++) {
        result += options.fn({
          index: i,
          number: i + 1,
          first: i === 0,
          last: i === count - 1,
          odd: i % 2 === 1,
          even: i % 2 === 0
        });
      }
      return result;
    });

    Handlebars.registerHelper('range', function(start: number, end: number, options: any) {
      let result = '';
      const from = Number(start) || 0;
      const to = Number(end) || 0;

      for (let i = from; i <= to; i++) {
        result += options.fn({
          value: i,
          index: i - from,
          first: i === from,
          last: i === to
        });
      }
      return result;
    });

    Handlebars.registerHelper('limit', function(this: any, array: any[], limit: number, options: any) {
      if (!Array.isArray(array)) return options.inverse(this);

      const limited = array.slice(0, Number(limit) || 0);
      let result = '';

      for (let i = 0; i < limited.length; i++) {
        result += options.fn({
          ...limited[i],
          '@index': i,
          '@first': i === 0,
          '@last': i === limited.length - 1
        });
      }

      return result;
    });

    Handlebars.registerHelper('offset', function(this: any, array: any[], offset: number, options: any) {
      if (!Array.isArray(array)) return options.inverse(this);

      const offsetArray = array.slice(Number(offset) || 0);
      let result = '';

      for (let i = 0; i < offsetArray.length; i++) {
        result += options.fn({
          ...offsetArray[i],
          '@index': i,
          '@first': i === 0,
          '@last': i === offsetArray.length - 1
        });
      }

      return result;
    });

    Handlebars.registerHelper('reverse', function(this: any, array: any[], options: any) {
      if (!Array.isArray(array)) return options.inverse(this);

      const reversed = [...array].reverse();
      let result = '';

      for (let i = 0; i < reversed.length; i++) {
        result += options.fn({
          ...reversed[i],
          '@index': i,
          '@first': i === 0,
          '@last': i === reversed.length - 1
        });
      }

      return result;
    });

    Handlebars.registerHelper('sort', function(this: any, array: any[], property: string, options: any) {
      if (!Array.isArray(array)) return options.inverse(this);

      const sorted = [...array].sort((a, b) => {
        const aVal = property ? a[property] : a;
        const bVal = property ? b[property] : b;

        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
      });

      let result = '';
      for (let i = 0; i < sorted.length; i++) {
        result += options.fn({
          ...sorted[i],
          '@index': i,
          '@first': i === 0,
          '@last': i === sorted.length - 1
        });
      }

      return result;
    });
  }
}
