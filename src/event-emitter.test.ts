import { test, expect, mock } from "bun:test";
import { EventEmitter } from "./event-emitter";

test("EventEmitter can register and emit events", () => {
  const emitter = new EventEmitter();
  const mockFn = mock();

  emitter.on("test", mockFn);
  emitter.emit("test", "arg1", "arg2");

  expect(mockFn).toHaveBeenCalledTimes(1);
  expect(mockFn).toHaveBeenCalledWith("arg1", "arg2");
});

test("EventEmitter can register multiple listeners", () => {
  const emitter = new EventEmitter();
  const mockFn1 = mock();
  const mockFn2 = mock();

  emitter.on("test", mockFn1);
  emitter.on("test", mockFn2);
  emitter.emit("test");

  expect(mockFn1).toHaveBeenCalledTimes(1);
  expect(mockFn2).toHaveBeenCalledTimes(1);
});

test("EventEmitter can unregister listeners", () => {
  const emitter = new EventEmitter();
  const mockFn = mock();

  emitter.on("test", mockFn);
  emitter.off("test", mockFn);
  emitter.emit("test");

  expect(mockFn).not.toHaveBeenCalled();
});

test("EventEmitter returns unsubscribe function", () => {
  const emitter = new EventEmitter();
  const mockFn = mock();

  const unsubscribe = emitter.on("test", mockFn);
  emitter.emit("test");
  expect(mockFn).toHaveBeenCalledTimes(1);

  unsubscribe();
  emitter.emit("test");
  expect(mockFn).toHaveBeenCalledTimes(1);
});

test("EventEmitter can remove all listeners for an event", () => {
  const emitter = new EventEmitter();
  const mockFn1 = mock();
  const mockFn2 = mock();

  emitter.on("test1", mockFn1);
  emitter.on("test2", mockFn2);

  emitter.removeAllListeners("test1");

  emitter.emit("test1");
  emitter.emit("test2");

  expect(mockFn1).not.toHaveBeenCalled();
  expect(mockFn2).toHaveBeenCalledTimes(1);
});

test("EventEmitter can remove all listeners", () => {
  const emitter = new EventEmitter();
  const mockFn1 = mock();
  const mockFn2 = mock();

  emitter.on("test1", mockFn1);
  emitter.on("test2", mockFn2);

  emitter.removeAllListeners();

  emitter.emit("test1");
  emitter.emit("test2");

  expect(mockFn1).not.toHaveBeenCalled();
  expect(mockFn2).not.toHaveBeenCalled();
});
