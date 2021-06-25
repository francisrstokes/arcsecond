import { ParserState } from "./parser";

//    updateError :: (ParserState e a s, f) -> ParserState f a s
export const updateError = <T, E, D, E2>(state: ParserState<T, E, D>, error: E2): ParserState<T, E2, D> => ({ ...state, isError: true, error });

//    updateResult :: (ParserState e a s, b) -> ParserState e b s
export const updateResult = <T, E, D, T2>(state: ParserState<T, E, D>, result: T2): ParserState<T2, E, D> => ({ ...state, result });

//    updateData :: (ParserState e a s, t) -> ParserState e b t
export const updateData = <T, E, D, D2>(state: ParserState<T, E, D>, data: D2): ParserState<T, E, D2> => ({ ...state, data });

//    updateResult :: (ParserState e a s, b, Integer) -> ParserState e b s
export const updateParserState = <T, E, D, T2>(state: ParserState<T, E, D>, result: T2, index: number): ParserState<T2, E, D> => ({
  ...state,
  result,
  index,
});