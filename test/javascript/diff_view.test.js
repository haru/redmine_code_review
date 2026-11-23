import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadClassicScripts } from './support/load_classic_script.js';

describe('diff view', () => {
  beforeEach(() => {
    loadClassicScripts();
    document.body.innerHTML = `
      <div id="content">
        <div id="code_review"></div>
        <div id="review-form-frame"><div id="review-form"></div></div>
      </div>`;
  });

  describe('setAddReviewButton', () => {
    const fileTable = `
      <table class="filecontent">
        <thead><tr><th class="filename">added.rb</th></tr></thead>
        <tbody>
          <tr><th data-txt="1"></th><td>line one</td></tr>
          <tr><th data-txt="2"></th><td>line two</td></tr>
        </tbody>
      </table>`;

    it('builds addReviewUrl and puts a pencil image on each line number cell', () => {
      document.body.innerHTML += fileTable;
      action_type = 'entry';
      rev = '1';
      rev_to = '';
      path = '/src/added.rb';
      repository_id = 'repo1';

      setAddReviewButton('/code_review/new', 5, '<img src="/images/edit.png">', false, false, '');

      expect(addReviewUrl).toBe(
        '/code_review/new?change_id=5&action_type=entry&rev=1&rev_to=' +
        '&attachment_id=&repository_id=repo1&path=%2Fsrc%2Fadded.rb'
      );
      expect(filenames[0]).toBe('added.rb');
      expect($('#review_span_1_0').length).toBe(1);
      expect($('#review_span_2_0 img').length).toBe(1);
      expect($('#add_revew_img_1_0').length).toBe(1);
      expect($('#add_revew_img_2_0').length).toBe(1);
    });

    it('reads the line number from a link inside the cell when the cell has no data-txt', () => {
      document.body.innerHTML += `
        <table class="filecontent">
          <thead><tr><th class="filename">linked.rb</th></tr></thead>
          <tbody><tr><th><a data-txt="4"></a></th><td>line four</td></tr></tbody>
        </table>`;
      action_type = 'entry';
      rev = '1';
      rev_to = '';
      path = '/src/linked.rb';
      repository_id = 'repo1';

      setAddReviewButton('/code_review/new', 5, '<img src="/images/edit.png">', false, false, '');

      expect($('#add_revew_img_4_0').length).toBe(1);
    });

    it('does not place images when the view is readonly', () => {
      document.body.innerHTML += fileTable;

      setAddReviewButton('/code_review/new', 5, '<img src="/images/edit.png">', true, false, '');

      expect($('#review_span_1_0 img').length).toBe(0);
      expect($('#review_span_2_0 img').length).toBe(0);
    });

    it('uses the second column for a side-by-side diff', () => {
      document.body.innerHTML += `
        <table class="filecontent">
          <thead><tr><th class="filename">added.rb</th></tr></thead>
          <tbody>
            <tr><th data-txt="1"></th><th data-txt="1"></th></tr>
          </tbody>
        </table>`;

      setAddReviewButton('/code_review/new', 5, '<img src="/images/edit.png">', false, true, '');

      const tr = $('table.filecontent tbody tr:first');
      expect(tr.find('th:nth-child(1) img').length).toBe(0);
      expect(tr.find('th:nth-child(2) img').length).toBe(1);
      expect(tr.find('th:nth-child(2) img').attr('id')).toBe('add_revew_img_1_0');
    });

    it('skips rows whose number cell has no line number', () => {
      document.body.innerHTML += `
        <table class="filecontent">
          <thead><tr><th class="filename">added.rb</th></tr></thead>
          <tbody>
            <tr><th></th><td>header line</td></tr>
            <tr><th data-txt="3"></th><td>line three</td></tr>
          </tbody>
        </table>`;

      setAddReviewButton('/code_review/new', 5, '<img src="/images/edit.png">', false, false, '');

      expect($('#review_span_3_0 img').length).toBe(1);
      expect($('th img').length).toBe(1);
    });
  });

  describe('clickPencil', () => {
    beforeEach(() => {
      document.body.innerHTML += `
        <table class="filecontent">
          <thead><tr><th class="filename">added.rb</th></tr></thead>
          <tbody>
            <tr><th data-txt="1"></th></tr>
          </tbody>
        </table>`;
      action_type = 'entry';
      rev = '1';
      rev_to = '';
      repository_id = 'repo1';
    });

    it('opens the review form for the clicked line and file', () => {
      path = '/src/added.rb';
      setAddReviewButton('/code_review/new', 5, '<img src="/images/edit.png">', false, false, '');
      const load = vi.spyOn($.fn, 'load');

      const e = $.Event('click', { pageX: 10, pageY: 20 });
      $('#add_revew_img_1_0').trigger(e);

      expect(e.isDefaultPrevented()).toBe(true);
      expect(load).toHaveBeenCalledTimes(1);
      expect(load).toHaveBeenCalledWith(
        addReviewUrl + '&line=1&file_count=0',
        undefined,
        expect.any(Function)
      );
      const target = load.mock.instances[0];
      expect(target.attr('id')).toBe('review-form');
    });

    it('adds the file path of the clicked line when the view is a full diff', () => {
      path = '';
      setAddReviewButton('/code_review/new', 5, '<img src="/images/edit.png">', false, false, '');
      const load = vi.spyOn($.fn, 'load');

      $('#add_revew_img_1_0').trigger('click');

      expect(load).toHaveBeenCalledWith(
        addReviewUrl + '&line=1&file_count=0&path=added.rb&diff_all=true',
        undefined,
        expect.any(Function)
      );
    });
  });

  describe('setShowReviewButton', () => {
    const reviewImageTag = '<img src="/images/review.png">';
    const closedImageTag = '<img src="/images/closed_review.png">';

    beforeEach(() => {
      document.body.innerHTML += '<span id="review_span_1_0"></span>';
      showReviewUrl = '/code_review/show';
      showReviewImageTag = reviewImageTag;
      showClosedReviewImageTag = closedImageTag;
      review_dialog_title = 'Code review';
    });

    it('does nothing when the target span is missing', () => {
      setShowReviewButton(9, 7, false, 9);

      expect($('#review_7').length).toBe(0);
      expect($('#show_review_7').length).toBe(0);
    });

    it('adds the review icon and popup target for an open review', () => {
      setShowReviewButton(1, 7, false, 0);

      expect($('#review_span_1_0 > span#review_7').length).toBe(1);
      expect($('#review_7').html()).toBe(reviewImageTag);
      expect($('#code_review > div#show_review_7').length).toBe(1);
      expect($('#code_review > div#show_review_7').hasClass('draggable')).toBe(true);
    });

    it('uses the closed icon for a closed review', () => {
      setShowReviewButton(1, 7, true, 0);

      expect($('#review_7').html()).toBe(closedImageTag);
    });

    it('loads and opens the review dialog when the icon is clicked', () => {
      setShowReviewButton(1, 7, false, 0);
      const load = vi.spyOn($.fn, 'load');

      $('#review_7 img').trigger('click');

      expect(load).toHaveBeenCalledWith('/code_review/show', { review_id: '7' }, expect.any(Function));
    });
  });

  describe('showReview', () => {
    beforeEach(() => {
      review_dialog_title = 'Code review';
    });

    it('loads the review into #show_review_<id> and opens it as a dialog', () => {
      document.body.innerHTML += '<div id="show_review_7"></div>';
      const load = vi.spyOn($.fn, 'load');

      const win = showReview('/code_review/show', 7, 15, 25);

      expect(load).toHaveBeenCalledWith('/code_review/show', { review_id: 7 }, expect.any(Function));
      expect(win).toBe(code_reviews_dialog_map[7]);
      expect($('#content .ui-dialog').length).toBe(1);
      expect($('.ui-dialog .ui-dialog-title').text()).toBe('Code review');
    });

    it('hides the existing dialog of the same review', () => {
      document.body.innerHTML += '<div id="show_review_7"></div>';
      const hide = vi.fn();
      const oldDialog = { hide: hide };
      code_reviews_dialog_map[7] = oldDialog;

      showReview('/code_review/show', 7, 15, 25);

      expect(hide).toHaveBeenCalledTimes(1);
      expect(code_reviews_dialog_map[7]).not.toBe(oldDialog);
      expect(code_reviews_dialog_map[7].is('#show_review_7')).toBe(true);
    });

    it('keeps the dialogs of other reviews untouched', () => {
      document.body.innerHTML += '<div id="show_review_8"></div>';
      const hide = vi.fn();
      code_reviews_dialog_map[8] = { hide: hide };

      showReview('/code_review/show', 7, 15, 25);

      expect(hide).not.toHaveBeenCalled();
      expect(code_reviews_dialog_map[8].hide).toBe(hide);
    });
  });

  describe('popupReview', () => {
    it('scrolls to the review and shows it', () => {
      document.body.innerHTML += '<span id="review_8"></span>';
      showReviewUrl = '/code_review/show';
      const showReviewSpy = vi.spyOn(globalThis, 'showReview');

      popupReview(8);

      expect(showReviewSpy).toHaveBeenCalledWith('/code_review/show', 8, 15, 0);
    });
  });

  describe('formPopup and hideForm', () => {
    beforeEach(() => {
      add_form_title = 'Add review';
    });

    it('opens the review form as a dialog inside #content', () => {
      const result = formPopup(10, 20);

      expect(result).toBe(false);
      expect($('#content > .ui-dialog').length).toBe(1);
      expect($('.ui-dialog .ui-dialog-title').text()).toBe('Add review');
      expect(review_form_dialog).not.toBeNull();
    });

    it('reopens the form when it was closed without hideForm (dialog X button)', () => {
      formPopup(10, 20);

      expect(() => formPopup(10, 20)).not.toThrow();
      expect($('#review-form-frame').dialog('isOpen')).toBe(true);
      expect($('#content > .ui-dialog').length).toBe(1);
    });

    it('closes the dialog and clears the form', () => {
      formPopup(10, 20);

      hideForm();

      expect($('#review-form-frame').dialog('isOpen')).toBe(false);
      expect(review_form_dialog).toBeNull();
      expect($('#review-form').html()).toBe('');
    });

    it('does nothing when the form was never opened', () => {
      $('#review-form').html('<p>form</p>');

      hideForm();

      expect($('#review-form').html()).toBe('<p>form</p>');
    });
  });

  describe('addReview', () => {
    it('loads the review form', () => {
      const load = vi.spyOn($.fn, 'load');

      addReview('/code_review/new?change_id=5');

      expect(load).toHaveBeenCalledTimes(1);
      expect(load).toHaveBeenCalledWith('/code_review/new?change_id=5', undefined, expect.any(Function));
      expect(load.mock.instances[0].attr('id')).toBe('review-form');
    });
  });

  describe('moveAssignLinkAboveFileContent', () => {
    it('moves the assign link before the first file content table', () => {
      $('#content').append(`
        <table class="filecontent"><tbody><tr><td>diff</td></tr></tbody></table>
        <div id="code-review-assign-link"></div>
        <table class="filecontent"><tbody><tr><td>diff 2</td></tr></tbody></table>`);

      moveAssignLinkAboveFileContent();

      expect($('table.filecontent:first').prev().attr('id')).toBe('code-review-assign-link');
    });

    it('does nothing when the link is missing', () => {
      $('#content').append('<table class="filecontent"><tbody><tr><td>diff</td></tr></tbody></table>');

      expect(() => moveAssignLinkAboveFileContent()).not.toThrow();
    });

    it('does nothing when there is no file content table', () => {
      $('#content').append('<div id="code-review-assign-link"></div>');

      expect(() => moveAssignLinkAboveFileContent()).not.toThrow();
      expect($('#content > div#code-review-assign-link').length).toBe(1);
    });
  });
});
