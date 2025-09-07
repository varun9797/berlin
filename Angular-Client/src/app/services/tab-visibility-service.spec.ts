import { TestBed } from '@angular/core/testing';

import { TabVisibilityService } from './tab-visibility-service';

describe('TabVisibilityService', () => {
  let service: TabVisibilityService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TabVisibilityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

});
