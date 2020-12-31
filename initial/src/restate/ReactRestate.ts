import React from "react"
import {StateManager} from "./Restate"
import {Transaction} from "./Restate"

export type UseSelectorState<T> = {
  selector: () => T
  previousResult: T
  onStateChange: () => void
}

export function ReactRestate(stateManager: StateManager) {
  function useSelector<T>(selector: () => T): T {
    const result = selector()

    // This incrementing value serves as the "trigger" that will force
    // the component to re-render when the selector returns a new result
    // after a state change.
    const setChangeCount = React.useState(0)[1]

    // We need to subscribe an onStateChange listener to the model that
    // will re-run the selector on state changes and force a re-render
    // if the result has changed.  This onStateChange listener must only
    // be created once and have a stable identity after that (to prevent
    // subscribe/unsubscribe thrashing - see useAppModelSubscriber).
    //
    // But this onStateChange listener must also have access to the
    // latest selector and previousResult values, which can change with
    // each re-render.  If we store those values in separate useState
    // calls, the onStateChange function won't have access to their
    // latest values - it will only have access to the values at the
    // time the function was defined (useState doesn't provide a
    // function to get the latest value).
    //
    // The solution is to create a single stable state object that
    // contains the latest selector, the previous result, and the
    // onStateChange listener.  We will update the selector and
    // prevoiusResult values ourselves with each re-render, and the
    // onStateChange function will be able to access them through a
    // stable "state" reference that will not change.
    //
    // Note that passing a function to useState is how we get it to
    // generate the initial value only once, instead of having it be
    // uselessly regenerated with each re-render.
    const state = React.useState<UseSelectorState<T>>(() => {
      return {
        selector,
        previousResult: result,
        onStateChange: () => {
          // FIXME - will this isSameValue optimization work?  It's
          // supposed to only change the identity of the result if the
          // result has different contents from the previous result.
          // But if both are proxies pointing back to the same
          // underlying data, won't it appear unchanged?  Need to
          // think about this.
          /*
          const result = state.selector()
          if (!isSameValue(result, state.previousResult)) {
            setChangeCount((c) => c + 1)
          }
          */
          state.selector()
          setChangeCount((c) => c + 1)
        },
      }
    })[0]

    // Update the state object with the latest results for the listener
    // to use
    state.selector = selector
    state.previousResult = result

    // Subscribe
    useSubscriber(state.onStateChange)

    // Call the selector
    return result
  }

  /** Used by useSelector to subscribe to appModel to be
   * notified of state changes by calling the specified function. */
  function useSubscriber(onStateChange: () => void) {
    // This is the typical useEffect pattern for calling something once
    // when the component renders the first time, then cleaning up when
    // the component is removed.  We need this "run once" behavior to
    // avoid subscribe/unsubscribe "thrashing".
    //
    // Typically this "run once" behavior is achieved by passing an
    // empty dependency array (the second argument to
    // useEffect). However, because the useEffect function references
    // stateManager and onStateChange, the linter will complain if
    // they're not considered dependencies.  So we have to include them
    // in the dependencies array, but we're counting on the fact that
    // these values never change so we don't lose the "run once"
    // behavior.
    React.useEffect(() => {
      const listener = (e: Transaction) => onStateChange()
      stateManager.transactionListeners.add(listener)
      return () => {
        stateManager.transactionListeners.remove(listener)
      }
    }, [onStateChange])
  }

  return {
    useSelector,
  }
}
