import { describe, it, expect, beforeEach } from 'vitest';
import { loadClassicScripts } from './support/load_classic_script.js';

describe('repository view', () => {
  beforeEach(() => {
    loadClassicScripts();
    document.body.innerHTML = '';
  });

  describe('ReviewCount', () => {
    it('computes closed as total minus open', () => {
      const count = new ReviewCount(10, 3, '30%');

      expect(count.total).toBe(10);
      expect(count.open).toBe(3);
      expect(count.closed).toBe(7);
      expect(count.progress).toBe('30%');
    });
  });

  describe('CodeReview', () => {
    it('initializes a review object with default values', () => {
      const review = new CodeReview(42);

      expect(review.id).toBe(42);
      expect(review.path).toBe('');
      expect(review.line).toBe(0);
      expect(review.url).toBe('');
      expect(review.is_closed).toBe(false);
    });
  });

  describe('UpdateRepositoryView', () => {
    it('adds a title column to the header and a progress cell to each revision row', () => {
      document.body.innerHTML = `
        <table class="changesets">
          <thead><tr><th>revision</th></tr></thead>
          <tbody>
            <tr class="changeset">
              <td class="id"><a href="/projects/demo/repository/revisions/123">123</a></td>
            </tr>
            <tr class="changeset">
              <td class="id"><a href="/projects/demo/repository/revisions/456">456</a></td>
            </tr>
          </tbody>
        </table>`;
      review_counts['revision_123'] = { progress: '2 open' };
      review_counts['revision_456'] = { progress: '0 open' };

      UpdateRepositoryView('code review');

      expect($('table.changesets thead tr:first th:last').html()).toBe('code review');
      expect($('tr.changeset td.progress').length).toBe(2);
      expect($('tr.changeset td.progress:first').html()).toBe('2 open');
      expect($('tr.changeset td.progress:last').html()).toBe('0 open');
    });
  });

  describe('UpdateRevisionView', () => {
    it('moves the assignments block right after the changes legend', () => {
      document.body.innerHTML = `
        <div id="changes-legend"></div>
        <ul class="changes"></ul>
        <div id="code_review_assignments"></div>`;

      UpdateRevisionView();

      expect($('#changes-legend').next().attr('id')).toBe('code_review_assignments');
    });

    it('lists the reviews of each changed file, skipping folders and entries without links', () => {
      urlprefix = '/projects/demo/repository/revisions/1/entry';
      document.body.innerHTML = `
        <ul class="changes">
          <li class="change folder"><a href="/projects/demo/repository/revisions/1/entry/src">src</a></li>
          <li class="change"><span class="icon icon-file">deleted.rb</span></li>
          <li class="change"><a href="/projects/demo/repository/revisions/1/entry/src/added.rb">added.rb</a></li>
          <li class="change"><a href="/projects/demo/repository/revisions/1/entry/src/edited.rb?rev_to=2">edited.rb</a></li>
        </ul>`;
      code_reviews_map['/src/added.rb'] = [
        { url: '<a href="/code_review/7">#7</a>', is_closed: false }
      ];
      code_reviews_map['/src/edited.rb'] = [
        { url: '<a href="/code_review/8">#8</a>', is_closed: true }
      ];

      UpdateRevisionView();

      const lis = $('li.change');
      expect(lis.eq(0).find('ul').length).toBe(0);
      expect(lis.eq(1).find('ul').length).toBe(0);

      const addedItems = lis.eq(2).find('ul li');
      expect(addedItems.length).toBe(1);
      expect(addedItems.hasClass('icon-review')).toBe(true);
      expect(addedItems.hasClass('code_review_summary')).toBe(true);
      expect(addedItems.find('a[href="/code_review/7"]').length).toBe(1);

      const editedItems = lis.eq(3).find('ul li');
      expect(editedItems.length).toBe(1);
      expect(editedItems.hasClass('icon-closed-review')).toBe(true);
      expect(editedItems.find('a[href="/code_review/8"]').length).toBe(1);
    });

    it('does not add a list when the path has no entry in the map', () => {
      urlprefix = '/projects/demo/repository/revisions/1/entry';
      document.body.innerHTML = `
        <ul class="changes">
          <li class="change"><a href="/projects/demo/repository/revisions/1/entry/src/other.rb">other.rb</a></li>
        </ul>`;

      UpdateRevisionView();

      expect($('li.change ul').length).toBe(0);
    });

    it('appends an empty list for a file without reviews', () => {
      urlprefix = '/projects/demo/repository/revisions/1/entry';
      document.body.innerHTML = `
        <ul class="changes">
          <li class="change"><a href="/projects/demo/repository/revisions/1/entry/src/other.rb">other.rb</a></li>
        </ul>`;
      code_reviews_map['/src/other.rb'] = [];

      UpdateRevisionView();

      expect($('li.change ul').length).toBe(1);
      expect($('li.change ul li').length).toBe(0);
    });
  });

});
