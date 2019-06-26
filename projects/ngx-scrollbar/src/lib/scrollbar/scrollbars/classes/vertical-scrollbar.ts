import { NgZone } from '@angular/core';
import { animationFrameScheduler, fromEvent, Observable } from 'rxjs';
import { mergeMap, pluck, takeUntil, tap } from 'rxjs/operators';
import { CustomScrollbar } from './custom-scrollbar';
import { NgScrollbar } from '../../ng-scrollbar';

export class VerticalScrollbar extends CustomScrollbar {

  constructor(protected scrollbarRef: NgScrollbar,
              protected document: any,
              protected zone: NgZone,
              protected containerElement: HTMLElement,
              protected thumbnailElement: HTMLElement) {
    super(scrollbarRef, document, zone, containerElement, thumbnailElement);
  }

  /**
   * Sets the thumbnail size for the vertical scrollbar
   */
  protected updateScrollbarThumbnailSize(): void {
    const barClientHeight = this.containerElement.clientHeight;
    const viewClientHeight = this.viewElement.clientHeight;
    const viewScrollHeight = this.viewElement.scrollHeight;
    this.naturalThumbSize = barClientHeight / viewScrollHeight * barClientHeight;
    this.scrollMax = viewScrollHeight - viewClientHeight;
    this.thumbnailSize = this.scrollBoundaries(this.naturalThumbSize, this.scrollMax);
  }

  protected listenToScrollEvent(): Observable<any> {
    return this.scrollbarRef.verticalScrolled;
  }

  /**
   * Scrolls to the clicked position on scrollbar container
   */
  containerClick(e: any): void {
    if (e.target === e.currentTarget) {
      const offsetY = e.offsetY - this.naturalThumbSize * .5;
      const thumbPositionPercentage = offsetY * 100 / this.containerElement.clientHeight;
      const value = thumbPositionPercentage * this.viewElement.scrollHeight / 100;
      this.scrollbarRef.scrollTo({top: value, duration: this.scrollbarRef.scrollToDuration});
    }
  }

  /**
   * Update scrollbar
   */
  protected updateScrollbarThumbnailPosition(): void {
    this.thumbSize = this.thumbnailElement.clientHeight;
    this.trackMax = this.containerElement.clientHeight - this.thumbSize;
    this.currPos = this.viewElement.scrollTop * this.trackMax / this.scrollMax;
    this.zone.run(() => {
      animationFrameScheduler.schedule(() =>
        this.updateState({
          transform: `translate3d(0, ${this.currPos}px, 0)`,
          height: `${this.thumbnailSize}px`
        })
      );
    });
  }

  /**
   * Start vertical thumb worker
   */
  protected startThumbEvents(): Observable<any> {
    const mouseDown$: Observable<any> = fromEvent(this.thumbnailElement, 'mousedown');
    const mouseMove$: Observable<any> = fromEvent(this.document, 'mousemove');
    const mouseUp$: Observable<any> = fromEvent(this.document, 'mouseup').pipe(
      tap(() => this.document.onselectstart = null)
    );
    return mouseDown$.pipe(
      tap(() => {
        this.document.onselectstart = () => false;
        // Initialize trackMax for before start dragging
        this.trackMax = this.containerElement.clientHeight - this.thumbSize;
      }),
      pluck('offsetY'),
      mergeMap((mouseDownOffset: number) => mouseMove$.pipe(
        takeUntil(mouseUp$),
        pluck('clientY'),
        tap((mouseMoveClient: number) => {
          const offsetY = mouseMoveClient - this.containerElement.getBoundingClientRect().top;
          const value = this.scrollMax * (offsetY - mouseDownOffset) / this.trackMax;
          this.scrollbarRef.scrollTo({top: value});
        })
      ))
    );
  }
}
