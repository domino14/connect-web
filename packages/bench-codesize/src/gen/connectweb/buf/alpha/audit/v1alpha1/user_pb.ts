/* eslint-disable */
// @generated by protoc-gen-es v0.0.1 with parameter "ts_nocheck=false"
// @generated from file buf/alpha/audit/v1alpha1/user.proto (package buf.alpha.audit.v1alpha1, syntax proto3)

import {proto3} from "@bufbuild/protobuf";

/**
 * @generated from enum buf.alpha.audit.v1alpha1.BufAlphaRegistryV1Alpha1UserState
 */
export enum BufAlphaRegistryV1Alpha1UserState {

    /**
     * @generated from enum value: BUF_ALPHA_REGISTRY_V1_ALPHA1_USER_STATE_UNSPECIFIED = 0;
     */
    BUF_ALPHA_REGISTRY_V1_ALPHA1_USER_STATE_UNSPECIFIED = 0,

    /**
     * @generated from enum value: BUF_ALPHA_REGISTRY_V1_ALPHA1_USER_STATE_ACTIVE = 1;
     */
    BUF_ALPHA_REGISTRY_V1_ALPHA1_USER_STATE_ACTIVE = 1,

    /**
     * @generated from enum value: BUF_ALPHA_REGISTRY_V1_ALPHA1_USER_STATE_DEACTIVATED = 2;
     */
    BUF_ALPHA_REGISTRY_V1_ALPHA1_USER_STATE_DEACTIVATED = 2,

}

// Retrieve enum metadata with: proto3.getEnumType(BufAlphaRegistryV1Alpha1UserState)
proto3.util.setEnumType(BufAlphaRegistryV1Alpha1UserState, "buf.alpha.audit.v1alpha1.BufAlphaRegistryV1Alpha1UserState", [
    {no: 0, name: "BUF_ALPHA_REGISTRY_V1_ALPHA1_USER_STATE_UNSPECIFIED"},
    {no: 1, name: "BUF_ALPHA_REGISTRY_V1_ALPHA1_USER_STATE_ACTIVE"},
    {no: 2, name: "BUF_ALPHA_REGISTRY_V1_ALPHA1_USER_STATE_DEACTIVATED"},
]);
