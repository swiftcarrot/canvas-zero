// Thank you! https://blog.julik.nl/2025/03/a-tiny-undo-stack
type ActionFunction = (...args: any[]) => void;

interface Action {
  doWithData(): void;
  undoWithData(): void;
}

export class UndoStack {
  private past: Action[] = [];
  private future: Action[] = [];

  push(
    doFn: ActionFunction,
    undoFn: ActionFunction,
    ...withArgumentsToClone: any[]
  ): void {
    const clonedArgs = structuredClone(withArgumentsToClone);
    const action: Action = {
      doWithData() {
        doFn(...clonedArgs);
      },
      undoWithData() {
        undoFn(...clonedArgs);
      },
    };
    action.doWithData();

    this.past.push(action);
    this.future.length = 0;
  }

  undo(): void {
    const action = this.past.pop();
    if (action) {
      action.undoWithData();
      this.future.unshift(action);
    }
  }

  redo(): void {
    const action = this.future.shift();
    if (action) {
      action.doWithData();
      this.past.push(action);
    }
  }

  get undoAvailable(): boolean {
    return this.past.length > 0;
  }

  get redoAvailable(): boolean {
    return this.future.length > 0;
  }

  clear(): boolean {
    this.past.length = 0;
    this.future.length = 0;
    return true;
  }
}
